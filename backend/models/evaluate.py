"""Quick post-training evaluation — writes eval_result.json."""
import json, warnings
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd, joblib
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score,
    precision_score, recall_score, confusion_matrix,
    classification_report
)
from sklearn.model_selection import train_test_split, cross_val_score
import os

MODELS_DIR = os.path.dirname(__file__)

df = pd.read_csv(os.path.join(MODELS_DIR, "uhi_dataset.csv"))
df["abs_lat"] = df["lat"].abs()
for col in ["lst_delta", "evi", "elevation", "ntl"]:
    if col not in df.columns:
        df[col] = 0.0
if "lst_delta" not in df.columns or df["lst_delta"].eq(0).all():
    if "rural_lst_mean" in df.columns:
        df["lst_delta"] = df["lst"] - df["rural_lst_mean"]
    else:
        df["lst_delta"] = df["lst"]

clf    = joblib.load(os.path.join(MODELS_DIR, "uhi_classifier.pkl"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))

features = (["lst_delta", "ndvi", "ndbi", "evi", "elevation", "ntl"]
            if clf.n_features_in_ >= 6 else ["lst", "ndvi", "ndbi"])

X = scaler.transform(df[features].values)
y = df["uhi_label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
y_pred = clf.predict(X_test)
y_prob = clf.predict_proba(X_test)[:, 1]

acc  = round(float(accuracy_score(y_test, y_pred)), 4)
prec = round(float(precision_score(y_test, y_pred, zero_division=0)), 4)
rec  = round(float(recall_score(y_test, y_pred, zero_division=0)), 4)
f1   = round(float(f1_score(y_test, y_pred, zero_division=0)), 4)
auc  = round(float(roc_auc_score(y_test, y_prob)), 4)

cv   = cross_val_score(clf, X, y, cv=5, scoring="f1", n_jobs=-1)
cm   = confusion_matrix(y_test, y_pred)

print(classification_report(y_test, y_pred, target_names=["No UHI", "UHI"]))

with open(os.path.join(MODELS_DIR, "feature_importance.json")) as fh:
    imp = json.load(fh)

result = {
    "model_version":    imp.get("model_version", "?"),
    "algorithm":        imp.get("classifier_algorithm", "?"),
    "features":         features,
    "n_features":       int(clf.n_features_in_),
    "dataset_rows":     len(df),
    "accuracy":         acc,
    "precision":        prec,
    "recall":           rec,
    "f1":               f1,
    "roc_auc":          auc,
    "cv_f1_mean":       round(float(cv.mean()), 4),
    "cv_f1_std":        round(float(cv.std()), 4),
    "confusion_matrix": {
        "TN": int(cm[0, 0]), "FP": int(cm[0, 1]),
        "FN": int(cm[1, 0]), "TP": int(cm[1, 1]),
    },
    "feature_importance": imp.get("classifier_importance", {}),
    "baseline_accuracy_v1": 0.7311,
}

out = os.path.join(MODELS_DIR, "eval_result.json")
with open(out, "w") as fh:
    json.dump(result, fh, indent=2)
print("Saved:", out)
