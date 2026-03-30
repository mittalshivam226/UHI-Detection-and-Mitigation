"""
ml_routes.py — ML-powered UHI analysis and simulation endpoints.

POST /ml/analyze-location
    Fetches real satellite data from GEE, runs ML classifier + regressor,
    returns UHI detection, probability, predicted temperature, and UHI score.

POST /ml/simulate
    Adjusts NDVI/NDBI features based on mitigation actions, re-runs
    the regression model to predict the new temperature.

GET  /ml/status
    Returns model loading status and feature importance metadata.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    MLAnalyzeRequest, MLAnalyzeResponse, MLEnvironmentalData,
    MLSimulateRequest, MLSimulateResponse, MLSimulateActionBreakdown,
    MLStatusResponse,
)
from app.services import gee_service, ml_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /ml/analyze-location ─────────────────────────────────────────────────

@router.post(
    "/analyze-location",
    response_model=MLAnalyzeResponse,
    summary="ML-based UHI analysis at a location",
    description=(
        "Fetches real Land Surface Temperature (Landsat 8/9) and spectral indices "
        "(Sentinel-2) from Google Earth Engine, then runs a trained Random Forest "
        "classifier for UHI detection and a Random Forest regressor for temperature "
        "prediction."
    ),
)
def ml_analyze_location(req: MLAnalyzeRequest) -> MLAnalyzeResponse:
    if not ml_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail=(
                "ML models are not loaded. "
                "Run backend/models/collect_dataset.py then backend/models/train_model.py first."
            ),
        )

    try:
        # 1. Fetch all v2 satellite features from GEE
        raw            = gee_service.fetch_environmental_data(req.lat, req.lon, req.radius_m)
        lst            = raw["lst_celsius"]
        ndvi           = raw["ndvi"]
        ndbi           = raw["ndbi"]
        evi            = raw.get("evi")
        elevation      = raw.get("elevation")
        ntl            = raw.get("ntl")
        rural_lst_mean = raw.get("rural_lst_mean")
        lst_delta      = raw.get("lst_delta")
        data_source    = raw.get("data_source", "unknown")

        # 2. ML Classification — UHI detection (v2: passes all 6 model features)
        clf_result = ml_service.predict_uhi(
            lst            = lst,
            ndvi           = ndvi,
            ndbi           = ndbi,
            rural_lst_mean = rural_lst_mean,
            evi            = evi,
            elevation      = elevation,
            ntl            = ntl,
        )

        # 3. ML Regression — temperature prediction (v2: adds evi, elevation, ntl)
        predicted_temp = ml_service.predict_temperature(
            ndvi           = ndvi,
            ndbi           = ndbi,
            lat            = req.lat,
            rural_lst_mean = rural_lst_mean,
            evi            = evi,
            elevation      = elevation,
            ntl            = ntl,
        )

        # 4. Composite UHI severity score (0–1)
        uhi_score = ml_service.compute_uhi_score(
            clf_result["uhi_probability"], lst, predicted_temp
        )

        # Detect whether the loaded model is v1 or v2
        status = ml_service.get_status()
        model_ver = status.get("model_version", "v2")

        logger.info(
            "ML analyze [%s] (%.4f, %.4f): LST=%.1f°C  ΔT=%.1f  NDVI=%.3f  NDBI=%.3f  "
            "EVI=%.3f  Elev=%.0fm  NTL=%.2f  UHI=%s  P=%.3f  Score=%.3f",
            model_ver, req.lat, req.lon, lst,
            lst_delta if lst_delta is not None else 0,
            ndvi, ndbi,
            evi if evi is not None else 0,
            elevation if elevation is not None else 0,
            ntl if ntl is not None else 0,
            clf_result["uhi_detected"], clf_result["uhi_probability"], uhi_score,
        )

        return MLAnalyzeResponse(
            coordinates={"lat": req.lat, "lon": req.lon, "radius_m": req.radius_m},
            environmental_data=MLEnvironmentalData(
                lst_celsius    = lst,
                ndvi           = ndvi,
                ndbi           = ndbi,
                data_source    = data_source,
                evi            = evi,
                elevation      = elevation,
                ntl            = ntl,
                rural_lst_mean = rural_lst_mean,
                lst_delta      = lst_delta,
            ),
            uhi_detected          = clf_result["uhi_detected"],
            uhi_probability       = clf_result["uhi_probability"],
            model_confidence      = clf_result["model_confidence"],
            model_version         = model_ver,
            predicted_temperature = predicted_temp,
            uhi_score             = uhi_score,
            feature_importance    = clf_result.get("feature_importance", {}),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("/ml/analyze-location failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"ML analysis failed: {exc}")


# ── POST /ml/simulate ─────────────────────────────────────────────────────────

@router.post(
    "/simulate",
    response_model=MLSimulateResponse,
    summary="ML-based mitigation temperature simulation",
    description=(
        "Applies vegetation/built-up index deltas for each mitigation action, "
        "then re-runs the Random Forest regressor to predict the new Land Surface "
        "Temperature. Fully ML-driven — no hardcoded °C values."
    ),
)
def ml_simulate(req: MLSimulateRequest) -> MLSimulateResponse:
    if not ml_service.is_ready():
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Run train_model.py first.",
        )

    if not req.actions:
        raise HTTPException(status_code=400, detail="At least one action is required.")

    try:
        result = ml_service.simulate_mitigation(
            ndvi           = req.ndvi,
            ndbi           = req.ndbi,
            actions        = req.actions,
            lat            = req.lat,
            rural_lst_mean = getattr(req, "rural_lst_mean", None),
            lst_celsius    = req.lst_celsius,
            intensities    = req.intensities,
            evi            = getattr(req, "evi", None),
            elevation      = getattr(req, "elevation", None),
            ntl            = getattr(req, "ntl", None),
        )

        logger.info(
            "ML simulate: NDVI=%.3f  NDBI=%.3f  actions=%s  "
            "%.1f°C → %.1f°C  (−%.2f°C)",
            req.ndvi, req.ndbi, req.actions,
            result["original_temperature"],
            result["new_temperature"],
            result["temperature_reduction"],
        )

        breakdown = [
            MLSimulateActionBreakdown(**b)
            for b in (result.get("per_action_breakdown") or [])
        ]

        return MLSimulateResponse(
            original_temperature=result["original_temperature"],
            new_temperature=result["new_temperature"],
            temperature_reduction=result["temperature_reduction"],
            modified_ndvi=result["modified_ndvi"],
            modified_ndbi=result["modified_ndbi"],
            applied_actions=result["applied_actions"],
            per_action_breakdown=breakdown,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("/ml/simulate failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}")


# ── GET /ml/status ────────────────────────────────────────────────────────────

@router.get(
    "/status",
    response_model=MLStatusResponse,
    summary="ML model status and metadata",
)
def ml_status() -> MLStatusResponse:
    status = ml_service.get_status()
    return MLStatusResponse(
        models_ready=status["models_ready"],
        supported_actions=status["supported_actions"],
        feature_importance=status.get("feature_importance"),
    )
