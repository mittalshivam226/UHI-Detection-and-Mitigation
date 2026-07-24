import json, ee, os

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

if "GEE_KEY" not in os.environ:
    import sys
    print("❌ GEE_KEY env var not set.")
    sys.exit(1)

key_data = json.loads(os.environ["GEE_KEY"])
temp_path = "/tmp/gee-key.json" if os.name != "nt" else "local_temp_key.json"
with open(temp_path, "w") as f:
    json.dump(key_data, f)
ee.Initialize(ee.ServiceAccountCredentials(key_data["client_email"], temp_path))

# Tokyo quick probe
point = ee.Geometry.Point([139.692, 35.689])
roi   = point.buffer(2000)

# S2
med  = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(roi).filterDate("2023-03-01","2023-07-31")
        .filterMetadata("CLOUDY_PIXEL_PERCENTAGE","less_than",20).median())
nir  = med.select("B8").divide(10000)
red  = med.select("B4").divide(10000)
blue = med.select("B2").divide(10000)
evi  = nir.subtract(red).divide(nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)).multiply(2.5).rename("EVI")
ndvi = med.normalizedDifference(["B8","B4"]).rename("NDVI")

# SRTM
elev = ee.Image("USGS/SRTMGL1_003").select("elevation")

# NTL
ntl  = (ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
        .filterBounds(roi).filterDate("2023-01-01","2023-12-31")
        .select("avg_rad").mean().rename("ntl"))

combined = evi.addBands(ndvi).addBands(elev).addBands(ntl)
result = combined.reduceRegion(ee.Reducer.mean(), roi, scale=100).getInfo()

out = {
    "EVI_mean":       round(result.get("EVI",0), 4),
    "NDVI_mean":      round(result.get("NDVI",0), 4),
    "elevation_mean": round(result.get("elevation",0), 1),
    "ntl_mean":       round(result.get("ntl",0), 4),
}
with open(os.path.join(os.path.dirname(__file__), "probe_result.json"), "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
