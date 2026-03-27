"""
train_model.py — UHI ML Pipeline: Train on real GEE-collected dataset.

Reads:  backend/models/uhi_dataset.csv   (from collect_dataset.py)
Writes: backend/models/uhi_classifier.pkl
        backend/models/temp_regressor.pkl
        backend/models/scaler.pkl
        backend/models/feature_importance.json

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

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
MODELS_DIR = os.path.dirname(__file__)
CSV_PATH   = os.path.join(MODELS_DIR, "uhi_dataset.csv")

CLASSIFIER_PATH  = os.path.join(MODELS_DIR, "uhi_classifier.pkl")
REGRESSOR_PATH   = os.path.join(MODELS_DIR, "temp_regressor.pkl")
SCALER_PATH      = os.path.join(MODELS_DIR, "scaler.pkl")
FEAT_IMP_PATH    = os.path.join(MODELS_DIR, "feature_importance.json")

SEPARATOR = "─" * 60


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

    print(f"\n    After cleaning: {len(df)} samples")
    print(f"    UHI=1 (hotspot): {df['uhi_label'].sum()} ({100*df['uhi_label'].mean():.1f}%)")
    print(f"    UHI=0 (normal) : {(df['uhi_label']==0).sum()} ({100*(1-df['uhi_label'].mean()):.1f}%)")

    if df["uhi_label"].nunique() < 2:
        print("\n❌  Dataset has only one class — cannot train a classifier.")
        sys.exit(1)

    if len(df) < 100:
        print(f"\n⚠️   Only {len(df)} rows — dataset is very small. Results may not generalise.")

    return df


def explore_dataset(df: pd.DataFrame):
    print(f"\n{SEPARATOR}")
    print("📊  DATASET STATISTICS")
    print(SEPARATOR)
    for col in ["lst", "ndvi", "ndbi"]:
        s = df[col]
        print(f"    {col.upper():6s}: mean={s.mean():.3f}  std={s.std():.3f}  "
              f"min={s.min():.3f}  max={s.max():.3f}")
    if "climate_zone" in df.columns:
        print(f"\n    Climate zones : {dict(df['climate_zone'].value_counts())}")
    if "city" in df.columns:
        print(f"    Cities covered: {df['city'].nunique()}")


# ── Classifier ────────────────────────────────────────────────────────────────

def train_classifier(df: pd.DataFrame) -> tuple[RandomForestClassifier, StandardScaler, dict]:
    print(f"\n{SEPARATOR}")
    print("🌲  TRAINING CLASSIFIER — Random Forest (UHI Detection)")
    print(SEPARATOR)

    # Features for classifier: LST, NDVI, NDBI (all three)
    clf_features = ["lst", "ndvi", "ndbi"]
    X = df[clf_features].values
    y = df["uhi_label"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.20, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators     = 200,
        max_depth        = None,
        min_samples_leaf = 2,
        class_weight     = "balanced",   # handles class imbalance
        random_state     = 42,
        n_jobs           = -1,
    )
    clf.fit(X_train, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred     = clf.predict(X_test)
    y_prob     = clf.predict_proba(X_test)[:, 1]
    acc        = accuracy_score(y_test, y_pred)
    prec       = precision_score(y_test, y_pred, zero_division=0)
    rec        = recall_score(y_test, y_pred, zero_division=0)
    f1         = f1_score(y_test, y_pred, zero_division=0)
    roc_auc    = roc_auc_score(y_test, y_prob)

    # 5-fold cross-validation on the full scaled dataset
    cv_scores  = cross_val_score(clf, X_scaled, y, cv=5, scoring="f1", n_jobs=-1)

    print(f"\n    Features     : {clf_features}")
    print(f"    Train / Test : {len(X_train)} / {len(X_test)} samples")
    print(f"\n    Accuracy     : {acc:.4f}")
    print(f"    Precision    : {prec:.4f}")
    print(f"    Recall       : {rec:.4f}")
    print(f"    F1-Score     : {f1:.4f}")
    print(f"    ROC-AUC      : {roc_auc:.4f}")
    print(f"    CV F1 (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['No UHI','UHI'])}")

    # ── Feature importance ────────────────────────────────────────────────────
    importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(clf_features, clf.feature_importances_)
    }
    print("    Feature Importance:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        bar = "█" * int(imp * 30)
        print(f"      {feat:6s}: {imp:.4f}  {bar}")

    return clf, scaler, importances


# ── Regressor ─────────────────────────────────────────────────────────────────

def train_regressor(df: pd.DataFrame) -> tuple[RandomForestRegressor, dict]:
    print(f"\n{SEPARATOR}")
    print("🌡️   TRAINING REGRESSOR — Random Forest (Temperature Prediction)")
    print(SEPARATOR)

    # Features for regressor: NDVI, NDBI + abs(lat) + rural_lst_mean → predict LST
    # abs(lat) encodes climate zone (tropical→0, polar→90)
    # rural_lst_mean is the thermal baseline of the surrounding landscape
    df = df.copy()
    df["abs_lat"] = df["lat"].abs()
    has_rural = "rural_lst_mean" in df.columns and df["rural_lst_mean"].notna().all()
    if has_rural:
        reg_features = ["ndvi", "ndbi", "abs_lat", "rural_lst_mean"]
    else:
        reg_features = ["ndvi", "ndbi", "abs_lat"]
    X = df[reg_features].values
    y = df["lst"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    reg = RandomForestRegressor(
        n_estimators     = 200,
        max_depth        = None,
        min_samples_leaf = 2,
        random_state     = 42,
        n_jobs           = -1,
    )
    reg.fit(X_train, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred = reg.predict(X_test)
    rmse   = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae    = float(mean_absolute_error(y_test, y_pred))
    r2     = float(r2_score(y_test, y_pred))

    # CV RMSE
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
        print(f"      {feat:6s}: {imp:.4f}  {bar}")

    return reg, reg_importances


# ── Main  ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{'═'*60}")
    print("  Urban Heat Intelligence — ML Pipeline Training")
    print(f"{'═'*60}")

    # 1. Load & validate data
    df = load_and_validate(CSV_PATH)
    explore_dataset(df)

    # 2. Train classifier
    clf, scaler, clf_importances = train_classifier(df)

    # 3. Train regressor
    reg, reg_importances = train_regressor(df)

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

    # 5. Save feature importance report
    importance_report = {
        "classifier_features": ["lst", "ndvi", "ndbi"],
        "regressor_features":  reg_importances,   # dynamic based on available columns
        "classifier_importance": clf_importances,
        "regressor_importance":  reg_importances,
        "dataset_rows": len(df),
        "uhi_positive_rate": round(float(df["uhi_label"].mean()), 4),
    }
    with open(FEAT_IMP_PATH, "w") as f:
        json.dump(importance_report, f, indent=2)
    print(f"    ✓ {FEAT_IMP_PATH}")

    print(f"\n{'═'*60}")
    print("  ✅ Training complete! Both models saved and ready.")
    print(f"{'═'*60}\n")


if __name__ == "__main__":
    main()
