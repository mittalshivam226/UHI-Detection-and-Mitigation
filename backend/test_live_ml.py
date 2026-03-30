"""Live HTTP test of /ml/analyze-location endpoint."""
import urllib.request, json, time

url  = 'http://localhost:8002/ml/analyze-location'
body = json.dumps({"lat": 28.6139, "lon": 77.2090, "radius_m": 1000}).encode()
req  = urllib.request.Request(
    url, data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)

t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=45) as r:
        d = json.loads(r.read())
    elapsed = round(time.time() - t0, 1)
    env = d.get("environmental_data", {})
    fi  = d.get("feature_importance", {})
    print(f"=== /ml/analyze-location  ({elapsed}s) ===")
    print(f"uhi_detected      : {d.get('uhi_detected')}")
    print(f"uhi_probability   : {d.get('uhi_probability')}")
    print(f"uhi_score         : {d.get('uhi_score')}")
    print(f"model_confidence  : {d.get('model_confidence')}")
    print(f"model_version     : {d.get('model_version')}")
    print(f"predicted_temp    : {d.get('predicted_temperature')}")
    print(f"--- environmental_data ---")
    for k in ["lst_celsius","ndvi","ndbi","evi","elevation","ntl","rural_lst_mean","lst_delta","data_source"]:
        print(f"  {k:18s}: {env.get(k)}")
    print(f"--- feature_importance ---")
    for feat, val in sorted(fi.items(), key=lambda x: -x[1]):
        print(f"  {feat:15s}: {val:.4f}")
    print("=== PASS ===")
except Exception as e:
    print(f"FAIL: {e}")
