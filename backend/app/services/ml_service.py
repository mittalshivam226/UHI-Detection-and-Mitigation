"""
ml_service.py — ML-Driven UHI Detection & Temperature Prediction Service.

Loads trained Random Forest models at startup and provides:
  - predict_uhi()           → UHI classification + probability
  - predict_temperature()   → Land Surface Temperature from spectral indices
  - compute_uhi_score()     → Normalised severity score 0–1
  - simulate_mitigation()   → Feature-delta simulation via regressor
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List, Optional

import numpy as np
import joblib

logger = logging.getLogger(__name__)

# ── Model paths ───────────────────────────────────────────────────────────────
_MODELS_DIR       = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
_CLASSIFIER_PATH  = os.path.join(_MODELS_DIR, "uhi_classifier.pkl")
_REGRESSOR_PATH   = os.path.join(_MODELS_DIR, "temp_regressor.pkl")
_SCALER_PATH      = os.path.join(_MODELS_DIR, "scaler.pkl")
_FEAT_IMP_PATH    = os.path.join(_MODELS_DIR, "feature_importance.json")

# ── Module-level model cache ──────────────────────────────────────────────────
_clf         = None   # RandomForestClassifier
_reg         = None   # RandomForestRegressor
_scaler      = None   # StandardScaler (for classifier inputs)
_feat_imp    = None   # dict
_models_ready = False

# ── Action feature deltas (how each mitigation shifts NDVI / NDBI) ───────────
# Based on published urban greening literature:
#   trees:      +0.18 NDVI (canopy addition), −0.05 NDBI (less bare surface)
#   cool_roof:  no NDVI change, −0.15 NDBI (reflective replaces dark surface)
#   water:      +0.10 NDVI-equivalent, −0.06 NDBI
#   green_roof: +0.08 NDVI, −0.10 NDBI
ACTION_DELTAS: Dict[str, Dict[str, float]] = {
    "trees":       {"ndvi": +0.18, "ndbi": -0.05},
    "cool_roof":   {"ndvi":  0.00, "ndbi": -0.15},
    "water":       {"ndvi": +0.10, "ndbi": -0.06},
    "green_roof":  {"ndvi": +0.08, "ndbi": -0.10},
}

# Temperature bounds for UHI score normalisation (°C)
_TEMP_LOW  = 20.0
_TEMP_HIGH = 55.0


# ── Initialisation ────────────────────────────────────────────────────────────

def load_models() -> bool:
    """
    Load all ML artefacts from disk. Call once at application startup.
    Returns True on success, False if models are not yet trained.
    """
    global _clf, _reg, _scaler, _feat_imp, _models_ready

    if _models_ready:
        return True

    missing = [
        p for p in [_CLASSIFIER_PATH, _REGRESSOR_PATH, _SCALER_PATH]
        if not os.path.exists(p)
    ]
    if missing:
        logger.warning(
            "ML models not found (%s). Run  backend/models/train_model.py  first.",
            [os.path.basename(p) for p in missing],
        )
        return False

    try:
        _clf    = joblib.load(_CLASSIFIER_PATH)
        _reg    = joblib.load(_REGRESSOR_PATH)
        _scaler = joblib.load(_SCALER_PATH)
        logger.info("✅ ML models loaded from %s", _MODELS_DIR)

        if os.path.exists(_FEAT_IMP_PATH):
            with open(_FEAT_IMP_PATH) as f:
                _feat_imp = json.load(f)

        _models_ready = True
        return True

    except Exception as exc:
        logger.exception("Failed to load ML models: %s", exc)
        return False


def is_ready() -> bool:
    return _models_ready


# ── Core ML Functions ─────────────────────────────────────────────────────────

def predict_uhi(lst: float, ndvi: float, ndbi: float) -> Dict:
    """
    Classify whether a location is a UHI hotspot.

    Returns:
        {
            "uhi_detected": bool,
            "uhi_probability": float,   # 0–1
            "model_confidence": str,    # "high" | "medium" | "low"
            "feature_importance": dict
        }
    """
    if not _models_ready:
        raise RuntimeError("ML models not loaded — call load_models() first.")

    X = np.array([[lst, ndvi, ndbi]], dtype=float)
    X_scaled = _scaler.transform(X)

    label   = int(_clf.predict(X_scaled)[0])
    prob    = float(_clf.predict_proba(X_scaled)[0][1])

    if prob >= 0.75 or prob <= 0.25:
        confidence = "high"
    elif 0.40 <= prob <= 0.60:
        confidence = "low"
    else:
        confidence = "medium"

    importance = {}
    if _feat_imp and "classifier_importance" in _feat_imp:
        importance = _feat_imp["classifier_importance"]

    return {
        "uhi_detected":      bool(label),
        "uhi_probability":   round(prob, 4),
        "model_confidence":  confidence,
        "feature_importance": importance,
    }


def predict_temperature(ndvi: float, ndbi: float, lat: float = 0.0, rural_lst_mean: float | None = None) -> float:
    """
    Predict Land Surface Temperature (°C) from spectral indices and location.

    Args:
        ndvi: Vegetation index
        ndbi: Built-up index
        lat:  Latitude (used as abs_lat climate-zone proxy, defaults to equator)
        rural_lst_mean: Rural buffer mean LST for this location (optional)
    """
    if not _models_ready:
        raise RuntimeError("ML models not loaded — call load_models() first.")

    # Build feature vector to match training order:
    # [ndvi, ndbi, abs_lat, rural_lst_mean]  (if rural_lst_mean available)
    # [ndvi, ndbi, abs_lat]                   (fallback)
    abs_lat = abs(lat)
    n_features = _reg.n_features_in_  # type: ignore[union-attr]
    if n_features >= 4 and rural_lst_mean is not None:
        X = np.array([[ndvi, ndbi, abs_lat, rural_lst_mean]], dtype=float)
    elif n_features >= 3:
        # Use abs_lat; pad rural_lst_mean with abs_lat as proxy if needed
        X = np.array([[ndvi, ndbi, abs_lat]], dtype=float)
        if n_features == 4:   # model expects 4 but rural not supplied
            X = np.array([[ndvi, ndbi, abs_lat, abs_lat * 0.8 + 10]], dtype=float)
    else:
        X = np.array([[ndvi, ndbi]], dtype=float)

    temp = float(_reg.predict(X)[0])  # type: ignore[union-attr]
    return round(temp, 2)


def compute_uhi_score(uhi_probability: float, lst: float, predicted_temp: float) -> float:
    """
    Compute a normalised UHI severity score (0–1).

    Combines:
      - 60% weight: model UHI probability
      - 25% weight: actual LST normalised against global range
      - 15% weight: predicted temperature normalised against global range
    """
    temp_norm  = max(0.0, min(1.0, (lst - _TEMP_LOW) / (_TEMP_HIGH - _TEMP_LOW)))
    pred_norm  = max(0.0, min(1.0, (predicted_temp - _TEMP_LOW) / (_TEMP_HIGH - _TEMP_LOW)))
    score      = 0.60 * uhi_probability + 0.25 * temp_norm + 0.15 * pred_norm
    return round(max(0.0, min(1.0, score)), 4)


def simulate_mitigation(
    ndvi: float,
    ndbi: float,
    actions: List[str],
    lat: float = 0.0,
    rural_lst_mean: Optional[float] = None,
) -> Dict:
    """
    Estimate temperature change after applying mitigation actions.

    Shifts NDVI/NDBI according to published greening literature deltas,
    then re-runs the regression model — giving an ML-based temperature estimate
    rather than a hardcoded °C lookup.

    Returns:
        {
            "original_temperature": float,
            "new_temperature": float,
            "temperature_reduction": float,
            "modified_ndvi": float,
            "modified_ndbi": float,
            "applied_actions": list[str]
        }
    """
    if not _models_ready:
        raise RuntimeError("ML models not loaded — call load_models() first.")

    original_temp = predict_temperature(ndvi, ndbi, lat, rural_lst_mean)

    # Apply feature deltas for each valid action
    mod_ndvi = ndvi
    mod_ndbi = ndbi
    applied  = []
    seen     = set()

    for action in actions:
        if action in seen or action not in ACTION_DELTAS:
            continue
        seen.add(action)
        delta = ACTION_DELTAS[action]
        mod_ndvi = min(1.0, mod_ndvi + delta["ndvi"])
        mod_ndbi = max(-1.0, mod_ndbi + delta["ndbi"])
        applied.append(action)

    new_temp   = predict_temperature(mod_ndvi, mod_ndbi, lat, rural_lst_mean)
    reduction  = round(max(0.0, original_temp - new_temp), 2)
    new_temp   = round(max(15.0, new_temp), 2)   # floor at 15 °C

    return {
        "original_temperature": original_temp,
        "new_temperature":      new_temp,
        "temperature_reduction": reduction,
        "modified_ndvi":        round(mod_ndvi, 4),
        "modified_ndbi":        round(mod_ndbi, 4),
        "applied_actions":      applied,
    }


# ── Status Helper ─────────────────────────────────────────────────────────────

def get_status() -> Dict:
    """Return ML model status metadata for diagnostics."""
    status = {
        "models_ready":      _models_ready,
        "classifier_path":   _CLASSIFIER_PATH,
        "regressor_path":    _REGRESSOR_PATH,
        "scaler_path":       _SCALER_PATH,
        "supported_actions": list(ACTION_DELTAS.keys()),
    }
    if _feat_imp:
        status["feature_importance"] = _feat_imp
    return status
