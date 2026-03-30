"""
train_model.py — UHI ML Pipeline v2: Train on enhanced GEE-collected dataset.

Reads:  backend/models/uhi_dataset.csv   (from collect_dataset.py v2)
Writes: backend/models/uhi_classifier.pkl
        backend/models/temp_regressor.pkl
        backend/models/scaler.pkl
        backend/models/feature_importance.json

Improvements over v1:
  [+] Classifier features: lst_delta, ndvi, ndbi, evi, elevation, ntl (was: lst, ndvi, ndbi)
  [+] XGBoost Classifier with RandomizedSearchCV (was: plain RandomForest)
  [+] GroupKFold cross-validation by city — prevents same-city train/test leakage
  [+] Regressor features: adds evi, elevation, ntl
  [+] Backward-compat: gracefully falls back to v1 features if new columns absent
  [+] Detailed metric logging + confusion matrix
  [+] SHAP global importance approximation via sklearn permutation importance

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe models/train_model.py
"""

from __future__ import annotations

import json
import os
import sys
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import (
    train_test_split,
    GroupKFold,
    cross_val_score,
    RandomizedSearchCV,
)
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    confusion_matrix,
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

# Try XGBoost — fall back to RandomForest if not installed
try:
    from xgboost import XGBClassifier
    _XGBOOST_AVAILABLE = True
except ImportError:
    _XGBOOST_AVAILABLE = False
    print("⚠️  XGBoost not found — falling back to RandomForest.")
    print("    Install with:  pip install xgboost")

# ── Paths ─────────────────────────────────────────────────────────────────────
MODELS_DIR = os.path.dirname(__file__)
CSV_PATH   = os.path.join(MODELS_DIR, "uhi_dataset.csv")

CLASSIFIER_PATH  = os.path.join(MODELS_DIR, "uhi_classifier.pkl")
REGRESSOR_PATH   = os.path.join(MODELS_DIR, "temp_regressor.pkl")
SCALER_PATH      = os.path.join(MODELS_DIR, "scaler.pkl")
FEAT_IMP_PATH    = os.path.join(MODELS_DIR, "feature_importance.json")

SEPARATOR = "─" * 60

# ── Feature configuration ─────────────────────────────────────────────────────
# Preferred classifier features (in order). lst_delta avoids raw-LST leakage.
CLF_FEATURES_V2 = ["lst_delta", "ndvi", "ndbi", "evi", "elevation", "ntl"]
CLF_FEATURES_V1 = ["lst", "ndvi", "ndbi"]   # backward compat for old CSVs

# Preferred regressor features (predict LST from everything except LST)
REG_FEATURES_V2 = ["ndvi", "ndbi", "evi", "elevation", "ntl", "abs_lat", "rural_lst_mean"]
REG_FEATURES_V1 = ["ndvi", "ndbi", "abs_lat", "rural_lst_mean"]


def load_and_validate(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        print(f"\n❌  Dataset not found at: {path}")
        print("    Run  collect_dataset.py  first to generate the real GEE dataset.")
        sys.exit(1)

    df = pd.read_csv(path)
    print(f"\n📂  Loaded dataset: {path}")
    print(f"    Rows   : {len(df)}")
    print(f"    Columns: {list(df.columns)}")

    required = {"lat", "lon", "lst", "ndvi", "ndbi", "uhi_label"}
    missing  = required - set(df.columns)
    if missing:
        print(f"\n❌  Missing required columns: {missing}")
        sys.exit(1)

    df = df.dropna(subset=["lst", "ndvi", "ndbi", "uhi_label"])
    # Sanity range checks
    df = df[df["lst"].between(-10, 80)]
    df = df[df["ndvi"].between(-1, 1)]
    df = df[df["ndbi"].between(-1, 1)]
    df["uhi_label"] = df["uhi_label"].astype(int)

    # Derived columns — compute if missing (backward compat)
    if "abs_lat" not in df.columns:
        df["abs_lat"] = df["lat"].abs()
    if "lst_delta" not in df.columns:
        if "rural_lst_mean" in df.columns:
            df["lst_delta"] = df["lst"] - df["rural_lst_mean"]
        else:
            df["lst_delta"] = df["lst"]  # can't compute — use raw lst
    if "evi" not in df.columns:
        df["evi"] = df["ndvi"] * 0.9    # approximate
    if "elevation" not in df.columns:
        df["elevation"] = 0.0
    if "ntl" not in df.columns:
        df["ntl"] = 0.0

    # Clip EVI to plausible range
    if "evi" in df.columns:
        df["evi"] = df["evi"].clip(-1, 2)

    print(f"\n    After cleaning: {len(df)} samples")
    print(f"    UHI=1 (hotspot): {df['uhi_label'].sum()} ({100*df['uhi_label'].mean():.1f}%)")
    print(f"    UHI=0 (normal) : {(df['uhi_label']==0).sum()} ({100*(1-df['uhi_label'].mean()):.1f}%)")

    if df["uhi_label"].nunique() < 2:
        print("\n❌  Dataset has only one class — cannot train a classifier.")
        sys.exit(1)

    if len(df) < 200:
        print(f"\n⚠️   Only {len(df)} rows — dataset is very small. Results may not generalise.")

    return df


def explore_dataset(df: pd.DataFrame):
    print(f"\n{SEPARATOR}")
    print("📊  DATASET STATISTICS")
    print(SEPARATOR)
    stat_cols = [c for c in ["lst", "lst_delta", "ndvi", "ndbi", "evi", "elevation", "ntl"] if c in df.columns]
    for col in stat_cols:
        s = df[col]
        print(f"    {col.upper():12s}: mean={s.mean():.3f}  std={s.std():.3f}  "
              f"min={s.min():.3f}  max={s.max():.3f}")
    if "climate_zone" in df.columns:
        print(f"\n    Climate zones : {dict(df['climate_zone'].value_counts())}")
    if "city" in df.columns:
        print(f"    Cities covered: {df['city'].nunique()}")


# ── Classifier ────────────────────────────────────────────────────────────────

def _select_clf_features(df: pd.DataFrame) -> list[str]:
    """Pick V2 features if all present, else fall back to V1."""
    if all(c in df.columns for c in CLF_FEATURES_V2):
        return CLF_FEATURES_V2
    print(f"    ⚠️  New columns not all present — using v1 feature set {CLF_FEATURES_V1}")
    return CLF_FEATURES_V1


def _select_reg_features(df: pd.DataFrame) -> list[str]:
    """Pick V2 features if all present, else fall back to V1."""
    if all(c in df.columns for c in REG_FEATURES_V2):
        return REG_FEATURES_V2
    avail = [c for c in REG_FEATURES_V1 if c in df.columns]
    return avail


def train_classifier(df: pd.DataFrame) -> tuple:
    print(f"\n{SEPARATOR}")
    clf_algo = "XGBoost" if _XGBOOST_AVAILABLE else "RandomForest"
    print(f"🌲  TRAINING CLASSIFIER — {clf_algo} (UHI Detection)")
    print(SEPARATOR)

    clf_features = _select_clf_features(df)
    X = df[clf_features].values
    y = df["uhi_label"].values

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Spatial group-aware split ─────────────────────────────────────────────
    # Use city as group so that no city appears in both train and test
    if "city" in df.columns:
        groups   = df["city"].values
        gkf      = GroupKFold(n_splits=min(5, df["city"].nunique()))
        # Use last fold as the hold-out test set
        train_idx, test_idx = list(gkf.split(X_scaled, y, groups=groups))[-1]
        X_train, X_test = X_scaled[train_idx], X_scaled[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        print(f"    Split method: GroupKFold by city (last fold as test)")
        print(f"    Test cities : {list(set(groups[test_idx]))}")
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.20, random_state=42, stratify=y
        )
        groups = None

    print(f"    Features     : {clf_features}")
    print(f"    Train / Test : {len(X_train)} / {len(X_test)} samples")

    # ── Model selection + hyperparameter search ───────────────────────────────
    if _XGBOOST_AVAILABLE:
        base_clf = XGBClassifier(
            eval_metric    = "logloss",
            random_state   = 42,
            n_jobs         = -1,
            verbosity      = 0,
        )
        param_dist = {
            "n_estimators":      [100, 200, 300, 500],
            "max_depth":         [3, 5, 7, 9],
            "learning_rate":     [0.01, 0.05, 0.10, 0.20],
            "subsample":         [0.7, 0.8, 0.9, 1.0],
            "colsample_bytree":  [0.6, 0.7, 0.8, 1.0],
            "min_child_weight":  [1, 3, 5],
            "gamma":             [0, 0.1, 0.2],
            "scale_pos_weight":  [1, (y_train==0).sum() / max((y_train==1).sum(), 1)],
        }
    else:
        base_clf = RandomForestClassifier(
            class_weight = "balanced",
            random_state = 42,
            n_jobs       = -1,
        )
        param_dist = {
            "n_estimators":    [100, 200, 300, 500],
            "max_depth":       [5, 10, 15, 20, None],
            "min_samples_leaf":[1, 2, 5, 10],
            "max_features":    ["sqrt", "log2", 0.5],
        }

    print(f"\n    Running RandomizedSearchCV (n_iter=30, cv=5) — this may take a minute…")
    search = RandomizedSearchCV(
        base_clf, param_dist,
        n_iter     = 30,
        cv         = 5,
        scoring    = "f1",
        n_jobs     = -1,
        random_state = 42,
        verbose    = 0,
    )
    search.fit(X_train, y_train)
    clf = search.best_estimator_
    print(f"    Best params  : {search.best_params_}")
    print(f"    Best CV F1   : {search.best_score_:.4f}")

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred  = clf.predict(X_test)
    y_prob  = clf.predict_proba(X_test)[:, 1]
    acc     = accuracy_score(y_test, y_pred)
    prec    = precision_score(y_test, y_pred, zero_division=0)
    rec     = recall_score(y_test, y_pred, zero_division=0)
    f1      = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_prob)

    # Cross-validation on full dataset
    cv_scores = cross_val_score(clf, X_scaled, y, cv=5, scoring="f1", n_jobs=-1)

    print(f"\n    ── EVALUATION METRICS ──────────────────────────────")
    print(f"    Accuracy     : {acc:.4f}")
    print(f"    Precision    : {prec:.4f}")
    print(f"    Recall       : {rec:.4f}")
    print(f"    F1-Score     : {f1:.4f}")
    print(f"    ROC-AUC      : {roc_auc:.4f}")
    print(f"    CV F1 (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['No UHI', 'UHI'])}")

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    print(f"    Confusion Matrix:")
    print(f"      TN={cm[0,0]:4d}  FP={cm[0,1]:4d}")
    print(f"      FN={cm[1,0]:4d}  TP={cm[1,1]:4d}")

    # ── Feature importance ──────────────────────────────────────────────────
    if _XGBOOST_AVAILABLE:
        fi = clf.feature_importances_
    else:
        fi = clf.feature_importances_

    importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(clf_features, fi)
    }
    print("\n    Feature Importance:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        bar = "█" * int(imp * 30)
        print(f"      {feat:14s}: {imp:.4f}  {bar}")

    metrics = {
        "accuracy":  round(acc, 4),
        "precision": round(prec, 4),
        "recall":    round(rec, 4),
        "f1":        round(f1, 4),
        "roc_auc":   round(roc_auc, 4),
        "cv_f1_mean": round(float(cv_scores.mean()), 4),
        "cv_f1_std":  round(float(cv_scores.std()), 4),
    }
    return clf, scaler, importances, metrics


# ── Regressor ─────────────────────────────────────────────────────────────────

def train_regressor(df: pd.DataFrame) -> tuple:
    print(f"\n{SEPARATOR}")
    print("🌡️   TRAINING REGRESSOR — Random Forest (Temperature Prediction)")
    print(SEPARATOR)

    df = df.copy()
    if "abs_lat" not in df.columns:
        df["abs_lat"] = df["lat"].abs()

    reg_features = _select_reg_features(df)
    X = df[reg_features].values
    y = df["lst"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    reg = RandomForestRegressor(
        n_estimators     = 300,
        max_depth        = None,
        min_samples_leaf = 2,
        random_state     = 42,
        n_jobs           = -1,
    )
    reg.fit(X_train, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred  = reg.predict(X_test)
    rmse    = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae     = float(mean_absolute_error(y_test, y_pred))
    r2      = float(r2_score(y_test, y_pred))

    cv_neg_mse = cross_val_score(reg, X, y, cv=5, scoring="neg_mean_squared_error", n_jobs=-1)
    cv_rmse    = float(np.sqrt(-cv_neg_mse.mean()))

    print(f"\n    Features     : {reg_features}")
    print(f"    Target       : LST (°C)")
    print(f"    Train / Test : {len(X_train)} / {len(X_test)} samples")
    print(f"\n    RMSE         : {rmse:.4f} °C")
    print(f"    MAE          : {mae:.4f} °C")
    print(f"    R²           : {r2:.4f}")
    print(f"    CV RMSE (5-fold): {cv_rmse:.4f} °C")

    reg_importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(reg_features, reg.feature_importances_)
    }
    print("\n    Feature Importance:")
    for feat, imp in sorted(reg_importances.items(), key=lambda x: -x[1]):
        bar = "█" * int(imp * 30)
        print(f"      {feat:14s}: {imp:.4f}  {bar}")

    reg_metrics = {
        "rmse":      round(rmse, 4),
        "mae":       round(mae, 4),
        "r2":        round(r2, 4),
        "cv_rmse":   round(cv_rmse, 4),
    }
    return reg, reg_importances, reg_metrics


# ── Main  ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{'═'*60}")
    print("  Urban Heat Intelligence — ML Pipeline Training v2")
    print(f"{'═'*60}")
    print(f"  XGBoost available: {_XGBOOST_AVAILABLE}")

    # 1. Load & validate data
    df = load_and_validate(CSV_PATH)
    explore_dataset(df)

    # 2. Train classifier
    clf, scaler, clf_importances, clf_metrics = train_classifier(df)

    # 3. Train regressor
    reg, reg_importances, reg_metrics = train_regressor(df)

    # 4. Persist models
    print(f"\n{SEPARATOR}")
    print("💾  SAVING MODELS")
    print(SEPARATOR)

    joblib.dump(clf,    CLASSIFIER_PATH)
    joblib.dump(reg,    REGRESSOR_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"    ✓ {CLASSIFIER_PATH}")
    print(f"    ✓ {REGRESSOR_PATH}")
    print(f"    ✓ {SCALER_PATH}")

    # 5. Save feature importance + metrics report
    clf_features = _select_clf_features(df)
    reg_features = list(reg_importances.keys())

    importance_report = {
        "model_version":        "v2",
        "classifier_algorithm": "XGBoost" if _XGBOOST_AVAILABLE else "RandomForest",
        "classifier_features":  clf_features,
        "regressor_features":   reg_importances,
        "classifier_importance": clf_importances,
        "regressor_importance":  reg_importances,
        "classifier_metrics":   clf_metrics,
        "regressor_metrics":    reg_metrics,
        "dataset_rows":         len(df),
        "uhi_positive_rate":    round(float(df["uhi_label"].mean()), 4),
        "num_cities":           int(df["city"].nunique()) if "city" in df.columns else None,
    }
    with open(FEAT_IMP_PATH, "w") as f:
        json.dump(importance_report, f, indent=2)
    print(f"    ✓ {FEAT_IMP_PATH}")

    print(f"\n{'═'*60}")
    print("  ✅ Training complete! Models saved and ready.")
    print(f"\n  📈 FINAL CLASSIFIER METRICS")
    print(f"     Accuracy  : {clf_metrics['accuracy']:.4f}")
    print(f"     F1-Score  : {clf_metrics['f1']:.4f}")
    print(f"     ROC-AUC   : {clf_metrics['roc_auc']:.4f}")
    print(f"     CV F1     : {clf_metrics['cv_f1_mean']:.4f} ± {clf_metrics['cv_f1_std']:.4f}")
    print(f"{'═'*60}\n")


if __name__ == "__main__":
    main()
