"""
verify_v2.py — Smoke test for v2 ML model integration.
Run from backend/ directory.
"""
from app.services import ml_service
from app.models.schemas import MLEnvironmentalData, MLSimulateRequest

print("=" * 55)
print("  UHI v2 ML Integration Verification")
print("=" * 55)

# 1. Schema check
env = MLEnvironmentalData(
    lst_celsius=35.0, ndvi=0.2, ndbi=0.3, data_source='test',
    evi=0.18, elevation=42.0, ntl=8.5, rural_lst_mean=30.5, lst_delta=4.5
)
print("[1] Schema MLEnvironmentalData (v2 fields): OK")

sim_req = MLSimulateRequest(ndvi=0.2, ndbi=0.3, actions=["trees"],
    evi=0.18, elevation=42.0, ntl=8.5, rural_lst_mean=30.5)
print("[2] Schema MLSimulateRequest   (v2 fields): OK")

# 2. Load models
ok = ml_service.load_models()
assert ok, "Models not found — run train_model.py first"
status = ml_service.get_status()
print(f"[3] Models loaded              : OK")
print(f"    Model version  : {status['model_version']}")
print(f"    CLF features   : {status['clf_feature_names']}")
print(f"    CLF n_features : {status['clf_n_features']}")
print(f"    REG n_features : {status['reg_n_features']}")

assert status['clf_n_features'] >= 6, "Loaded model is v1 (3 features) — retrain with v2 dataset"

# 3. predict_uhi with all v2 features
res = ml_service.predict_uhi(
    lst=35.0, ndvi=0.2, ndbi=0.3,
    rural_lst_mean=30.5, evi=0.18, elevation=42.0, ntl=8.5
)
print(f"[4] predict_uhi  (v2 6-feat)   : OK")
print(f"    UHI detected  : {res['uhi_detected']}")
print(f"    Probability   : {res['uhi_probability']}")
print(f"    Confidence    : {res['model_confidence']}")

# 4. predict_temperature with all v2 features
t = ml_service.predict_temperature(
    ndvi=0.2, ndbi=0.3, lat=28.6,
    rural_lst_mean=30.5, evi=0.18, elevation=42.0, ntl=8.5
)
print(f"[5] predict_temp (v2 7-feat)   : {t} C  OK")

# 5. compute_uhi_score
score = ml_service.compute_uhi_score(res['uhi_probability'], 35.0, t)
print(f"[6] compute_uhi_score          : {score}  OK")

# 6. simulate_mitigation
sim = ml_service.simulate_mitigation(
    ndvi=0.2, ndbi=0.3, actions=["trees", "cool_roof"],
    lat=28.6, rural_lst_mean=30.5,
    lst_celsius=35.0, evi=0.18, elevation=42.0, ntl=8.5,
    intensities={"trees": 80, "cool_roof": 60}
)
print(f"[7] simulate_mitigation        : OK")
print(f"    {sim['original_temperature']}C -> {sim['new_temperature']}C  "
      f"(reduction: {sim['temperature_reduction']}C)")
print(f"    Actions: {sim['applied_actions']}")

print()
print("=" * 55)
print("  ALL v2 INTEGRATION CHECKS PASSED")
print("=" * 55)
