"""
smoke_test.py — Test collect_dataset.py v2 on ONE city before full run.
Validates that EVI, elevation, and NTL all return real non-zero values.
"""
import json, os, sys
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

import ee

GEE_KEY_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "gee-key.json"))

def init_gee():
    with open(GEE_KEY_PATH) as f:
        key = json.load(f)
    creds = ee.ServiceAccountCredentials(key["client_email"], GEE_KEY_PATH)
    ee.Initialize(creds)
    print("GEE initialized:", key["client_email"])

URBAN_BUFFER_M = 2_000
RURAL_INNER_M  = 8_000
RURAL_OUTER_M  = 15_000
SAMPLE_SCALE_M = 100
NUM_SAMPLES    = 5        # small — just confirm features return values
CLOUD_MAX      = 20
MONTH_START, MONTH_END = 3, 7
YEAR_START,  YEAR_END  = 2021, 2024

def smoke_test(city_name, lat, lon):
    print(f"\n=== Smoke test: {city_name} ({lat}, {lon}) ===")
    point     = ee.Geometry.Point([lon, lat])
    urban_roi = point.buffer(URBAN_BUFFER_M)
    rural_roi = point.buffer(RURAL_OUTER_M).difference(point.buffer(RURAL_INNER_M))
    all_bounds = rural_roi

    # --- LST ---
    col = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
           .filterBounds(all_bounds)
           .filter(ee.Filter.calendarRange(MONTH_START, MONTH_END, "month"))
           .filter(ee.Filter.calendarRange(YEAR_START,  YEAR_END,  "year"))
           .filterMetadata("CLOUD_COVER", "less_than", CLOUD_MAX))
    if col.size().getInfo() == 0:
        col = (ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
               .filterBounds(all_bounds)
               .filter(ee.Filter.calendarRange(MONTH_START, MONTH_END, "month"))
               .filter(ee.Filter.calendarRange(YEAR_START,  YEAR_END,  "year"))
               .filterMetadata("CLOUD_COVER", "less_than", CLOUD_MAX))
    lst_img = (col.median().select("ST_B10")
               .multiply(0.00341802).add(149.0).subtract(273.15).rename("LST"))
    print("  LST image: OK")

    # --- Rural mean ---
    rural_stats = lst_img.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=rural_roi, scale=30, maxPixels=1e9
    ).getInfo()
    rural_mean = rural_stats.get("LST")
    print(f"  Rural LST mean: {round(rural_mean, 2) if rural_mean else 'MISSING'}°C")

    # --- Sentinel-2 ---
    s2col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
             .filterBounds(all_bounds)
             .filter(ee.Filter.calendarRange(MONTH_START, MONTH_END, "month"))
             .filter(ee.Filter.calendarRange(YEAR_START,  YEAR_END,  "year"))
             .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", CLOUD_MAX))
    med  = s2col.median()
    ndvi = med.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndbi = med.normalizedDifference(["B11","B8"]).rename("NDBI")
    nir  = med.select("B8").divide(10000)
    red  = med.select("B4").divide(10000)
    blue = med.select("B2").divide(10000)
    evi  = nir.subtract(red).divide(
        nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)
    ).multiply(2.5).rename("EVI")
    print("  S2 (NDVI/NDBI/EVI): OK")

    # --- Elevation ---
    elev = ee.Image("USGS/SRTMGL1_003").select("elevation").rename("elevation")
    print("  SRTM elevation: OK")

    # --- NTL ---
    ntl_col = (ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
               .filterBounds(all_bounds)
               .filterDate("2023-01-01", "2023-12-31")
               .select("avg_rad"))
    ntl_size = ntl_col.size().getInfo()
    ntl_img  = ntl_col.mean().rename("ntl") if ntl_size > 0 else None
    print(f"  VIIRS NTL images: {ntl_size}")

    # --- Sample 5 urban points ---
    combined = lst_img.addBands(ndvi).addBands(ndbi).addBands(evi).addBands(elev)
    if ntl_img:
        combined = combined.addBands(ntl_img)

    samples  = combined.sample(
        region=urban_roi, scale=SAMPLE_SCALE_M,
        numPixels=NUM_SAMPLES, geometries=True, seed=42
    )
    feats = samples.getInfo().get("features", [])
    print(f"\n  Sampled {len(feats)} points:")
    for f in feats:
        p = f["properties"]
        print(f"    LST={p.get('LST','?'):.2f}  NDVI={p.get('NDVI','?'):.4f}  "
              f"NDBI={p.get('NDBI','?'):.4f}  EVI={p.get('EVI','?'):.4f}  "
              f"elev={p.get('elevation','?'):.0f}m  "
              f"ntl={p.get('ntl', 'N/A')}")

    # --- Verdict ---
    all_evi   = [f["properties"].get("EVI")       for f in feats]
    all_elev  = [f["properties"].get("elevation") for f in feats]
    all_ntl   = [f["properties"].get("ntl")       for f in feats]
    has_evi   = any(v is not None and abs(v) > 0.001 for v in all_evi)
    has_elev  = any(v is not None and v != 0        for v in all_elev)
    has_ntl   = any(v is not None and v > 0         for v in all_ntl)

    print(f"\n  VERDICT:")
    print(f"    EVI real values    : {'YES' if has_evi  else 'NO — check bands'}")
    print(f"    Elevation non-zero : {'YES' if has_elev else 'NO (flat city or error)'}")
    print(f"    NTL captured       : {'YES' if has_ntl  else 'NO — VIIRS may be unavailable'}")

    if has_evi and has_elev:
        print("\n  SMOKE TEST PASSED — safe to run full collect_dataset.py")
        return True
    else:
        print("\n  SMOKE TEST FAILED — check GEE access / band names")
        return False

if __name__ == "__main__":
    init_gee()
    # Test with Tokyo — temperate, good imagery, clear EVI signal
    ok = smoke_test("Tokyo", 35.689, 139.692)
    sys.exit(0 if ok else 1)
