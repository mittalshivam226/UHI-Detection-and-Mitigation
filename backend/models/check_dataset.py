"""Quick check: verify EVI, elevation, ntl have real non-zero values in new CSV."""
import pandas as pd, json, os
df = pd.read_csv(os.path.join(os.path.dirname(__file__), "uhi_dataset.csv"))
result = {
    "total_rows": len(df),
    "columns": list(df.columns),
    "uhi_positive_pct": round(df["uhi_label"].mean() * 100, 1),
    "evi_non_zero": int((df["evi"].abs() > 0.001).sum()),
    "elevation_non_zero": int((df["elevation"].abs() > 0).sum()),
    "ntl_non_zero": int((df["ntl"] > 0).sum()),
    "evi_stats":       {"mean": round(df["evi"].mean(),4), "std": round(df["evi"].std(),4), "min": round(df["evi"].min(),4), "max": round(df["evi"].max(),4)},
    "elevation_stats": {"mean": round(df["elevation"].mean(),1), "std": round(df["elevation"].std(),1), "min": round(df["elevation"].min(),1), "max": round(df["elevation"].max(),1)},
    "ntl_stats":       {"mean": round(df["ntl"].mean(),4), "std": round(df["ntl"].std(),4), "min": round(df["ntl"].min(),4), "max": round(df["ntl"].max(),4)},
    "lst_delta_stats": {"mean": round(df["lst_delta"].mean(),4), "std": round(df["lst_delta"].std(),4)},
}
out = os.path.join(os.path.dirname(__file__), "dataset_check.json")
with open(out, "w") as f:
    json.dump(result, f, indent=2)
print(json.dumps(result, indent=2))
