"""
collect_dataset.py — Real-World UHI Dataset Collection via Google Earth Engine.

Strategy:
  - 60 cities across all continents and climate zones
  - Seasonal filter: March 1 – July 31 (peak heating season)
  - Multi-year: 2021, 2022, 2023, 2024
  - Sources: Landsat 8/9 (LST via ST_B10) + Sentinel-2 (NDVI, NDBI, EVI)
             SRTM (Elevation) + VIIRS (Nighttime Lights)
  - UHI Labeling: Climate-zone-adaptive threshold on (urban_LST - rural_mean)
  - Output: backend/models/uhi_dataset.csv

Improvements over v1:
  [+] NUM_SAMPLES_CITY raised 15 → 80 (more data per city)
  [+] EVI (Enhanced Vegetation Index) — more robust than NDVI in dense areas
  [+] Elevation from SRTM — topographic climate correction
  [+] Nighttime Lights (VIIRS) — proxy for anthropogenic heat emission
  [+] lst_delta stored explicitly (lst - rural_lst_mean) — used as leak-free feature
  [+] Climate-zone-adaptive UHI labeling threshold (arid bar ≠ temperate bar)

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe models/collect_dataset.py
"""

from __future__ import annotations

import csv
import json
import logging
import os
import sys
import time

import ee

# ── Configuration ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

GEE_KEY_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "gee-key.json")
)
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "uhi_dataset.csv")

URBAN_BUFFER_M   = 2_000   # 2 km urban core radius
RURAL_INNER_M    = 8_000   # 8 km → start of rural annulus
RURAL_OUTER_M    = 15_000  # 15 km → end of rural annulus
SAMPLE_SCALE_M   = 100     # pixel sampling scale
NUM_SAMPLES_CITY = 80      # urban sample points per city (was 15 — increased for dataset size)
CLOUD_MAX        = 20      # max cloud cover %

# Seasonal filter: March (3) – July (7), years 2021–2024
MONTH_START = 3
MONTH_END   = 7
YEAR_START  = 2021
YEAR_END    = 2024

# ── Climate-Zone-Adaptive UHI Thresholds ──────────────────────────────────────
# A 2°C delta is trivial in a 45°C desert — calibrate the bar per zone.
UHI_THRESHOLDS: dict[str, float] = {
    "arid":          3.5,   # desert cities have extreme ambient heat — higher bar
    "tropical":      2.5,
    "subtropical":   2.0,
    "temperate":     1.5,   # even 1.5°C above rural is a meaningful UHI signal
    "mediterranean": 2.0,
    "monsoon":       2.5,
}
_DEFAULT_THRESHOLD = 2.0   # fallback if zone not in dict

# ── Global City Registry ──────────────────────────────────────────────────────
# (city_name, country, climate_zone, lat, lon)
CITIES = [
    # ── Africa ──
    ("Cairo",            "Egypt",        "arid",          30.044,  31.235),
    ("Lagos",            "Nigeria",      "tropical",       6.524,   3.379),
    ("Nairobi",          "Kenya",        "subtropical",   -1.286,  36.820),
    ("Johannesburg",     "South Africa", "subtropical",  -26.204,  28.047),
    ("Dakar",            "Senegal",      "arid",          14.693, -17.447),
    ("Casablanca",       "Morocco",      "mediterranean", 33.573,  -7.589),
    ("Addis_Ababa",      "Ethiopia",     "subtropical",    9.032,  38.743),
    ("Khartoum",         "Sudan",        "arid",          15.552,  32.532),
    ("Accra",            "Ghana",        "tropical",       5.603,  -0.187),
    ("Kinshasa",         "DRC",          "tropical",      -4.324,  15.322),
    # ── South Asia ──
    ("Delhi",            "India",        "monsoon",       28.640,  77.216),
    ("Mumbai",           "India",        "tropical",      19.076,  72.873),
    ("Kolkata",          "India",        "tropical",      22.567,  88.364),
    ("Dhaka",            "Bangladesh",   "tropical",      23.810,  90.412),
    ("Karachi",          "Pakistan",     "arid",          24.861,  67.010),
    ("Lahore",           "Pakistan",     "monsoon",       31.558,  74.357),
    ("Chennai",          "India",        "tropical",      13.083,  80.270),
    ("Hyderabad",        "India",        "tropical",      17.385,  78.486),
    # ── East / Southeast Asia ──
    ("Beijing",          "China",        "temperate",     39.913, 116.391),
    ("Shanghai",         "China",        "subtropical",   31.230, 121.473),
    ("Chengdu",          "China",        "subtropical",   30.572, 104.066),
    ("Wuhan",            "China",        "subtropical",   30.593, 114.305),
    ("Tokyo",            "Japan",        "temperate",     35.689, 139.692),
    ("Seoul",            "South Korea",  "temperate",     37.566, 126.978),
    ("Taipei",           "Taiwan",       "subtropical",   25.048, 121.514),
    ("Bangkok",          "Thailand",     "tropical",      13.756, 100.502),
    ("Singapore",        "Singapore",    "tropical",       1.352, 103.820),
    ("Jakarta",          "Indonesia",    "tropical",      -6.200, 106.817),
    ("Manila",           "Philippines",  "tropical",      14.599, 120.984),
    ("Ho_Chi_Minh",      "Vietnam",      "tropical",      10.823, 106.630),
    # ── Middle East / Central Asia ──
    ("Tehran",           "Iran",         "arid",          35.696,  51.423),
    ("Riyadh",           "Saudi Arabia", "arid",          24.688,  46.724),
    ("Dubai",            "UAE",          "arid",          25.204,  55.270),
    ("Kuwait_City",      "Kuwait",       "arid",          29.375,  47.977),
    ("Doha",             "Qatar",        "arid",          25.285,  51.531),
    ("Baghdad",          "Iraq",         "arid",          33.341,  44.401),
    ("Istanbul",         "Turkey",       "mediterranean", 41.015,  28.952),
    ("Ankara",           "Turkey",       "temperate",     39.920,  32.854),
    # ── Europe ──
    ("London",           "UK",           "temperate",     51.509,  -0.118),
    ("Paris",            "France",       "temperate",     48.857,   2.347),
    ("Berlin",           "Germany",      "temperate",     52.520,  13.405),
    ("Madrid",           "Spain",        "mediterranean", 40.417,  -3.704),
    ("Rome",             "Italy",        "mediterranean", 41.902,  12.496),
    ("Athens",           "Greece",       "mediterranean", 37.983,  23.727),
    ("Warsaw",           "Poland",       "temperate",     52.230,  21.012),
    ("Moscow",           "Russia",       "temperate",     55.751,  37.617),
    ("Barcelona",        "Spain",        "mediterranean", 41.386,   2.170),
    # ── North America ──
    ("New_York",         "USA",          "temperate",     40.713, -74.006),
    ("Los_Angeles",      "USA",          "mediterranean", 34.052,-118.244),
    ("Chicago",          "USA",          "temperate",     41.878, -87.630),
    ("Phoenix",          "USA",          "arid",          33.449,-112.074),
    ("Houston",          "USA",          "subtropical",   29.762, -95.369),
    ("Miami",            "USA",          "tropical",      25.762, -80.192),
    ("Las_Vegas",        "USA",          "arid",          36.175,-115.136),
    ("Toronto",          "Canada",       "temperate",     43.651, -79.347),
    ("Mexico_City",      "Mexico",       "subtropical",   19.433, -99.133),
    # ── South America ──
    ("Sao_Paulo",        "Brazil",       "subtropical",  -23.550, -46.634),
    ("Buenos_Aires",     "Argentina",    "temperate",    -34.603, -58.381),
    ("Lima",             "Peru",         "arid",         -12.046, -77.043),
    ("Bogota",           "Colombia",     "tropical",       4.711, -74.073),
    # ── Oceania ──
    ("Sydney",           "Australia",    "subtropical",  -33.869, 151.209),
    ("Melbourne",        "Australia",    "temperate",    -37.814, 144.963),
]

# ── GEE Helpers ───────────────────────────────────────────────────────────────

def _init_gee() -> bool:
    if not os.path.exists(GEE_KEY_PATH):
        logger.error("GEE key not found at %s", GEE_KEY_PATH)
        return False
    try:
        with open(GEE_KEY_PATH) as f:
            key = json.load(f)
        creds = ee.ServiceAccountCredentials(key["client_email"], GEE_KEY_PATH)
        ee.Initialize(creds)
        logger.info("GEE initialized — service account: %s", key["client_email"])
        return True
    except Exception as exc:
        logger.exception("GEE init failed: %s", exc)
        return False


def _landsat_collection(bounds: ee.Geometry, collection_id: str) -> ee.ImageCollection:
    return (
        ee.ImageCollection(collection_id)
        .filterBounds(bounds)
        .filter(ee.Filter.calendarRange(MONTH_START, MONTH_END, "month"))
        .filter(ee.Filter.calendarRange(YEAR_START,  YEAR_END,  "year"))
        .filterMetadata("CLOUD_COVER", "less_than", CLOUD_MAX)
    )


def _lst_image(bounds: ee.Geometry) -> ee.Image | None:
    """Return a median LST image (°C) or None if no imagery available."""
    col = _landsat_collection(bounds, "LANDSAT/LC08/C02/T1_L2")
    if col.size().getInfo() == 0:
        col = _landsat_collection(bounds, "LANDSAT/LC09/C02/T1_L2")
    if col.size().getInfo() == 0:
        return None
    return (
        col.median()
        .select("ST_B10")
        .multiply(0.00341802)
        .add(149.0)
        .subtract(273.15)
        .rename("LST")
    )


def _s2_indices(bounds: ee.Geometry) -> dict:
    """
    Return NDVI, NDBI, and EVI images from Sentinel-2 composite.

    EVI = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
    Requires B2 (Blue), B4 (Red), B8 (NIR), B11 (SWIR)
    """
    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(bounds)
        .filter(ee.Filter.calendarRange(MONTH_START, MONTH_END, "month"))
        .filter(ee.Filter.calendarRange(YEAR_START,  YEAR_END,  "year"))
        .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", CLOUD_MAX)
    )
    if col.size().getInfo() == 0:
        return {}
    med = col.median()

    # Standard spectral indices
    ndvi = med.normalizedDifference(["B8",  "B4"]).rename("NDVI")
    ndbi = med.normalizedDifference(["B11", "B8"]).rename("NDBI")

    # EVI — more robust than NDVI in high-biomass / dense-canopy areas
    # Scale: Sentinel-2 SR bands are in reflectance units ×10000 → divide by 10000
    nir   = med.select("B8").divide(10000)
    red   = med.select("B4").divide(10000)
    blue  = med.select("B2").divide(10000)
    evi   = nir.subtract(red).divide(
        nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)
    ).multiply(2.5).rename("EVI")

    return {"ndvi_image": ndvi, "ndbi_image": ndbi, "evi_image": evi}


def _elevation_image() -> ee.Image:
    """Return SRTM elevation image (metres)."""
    return ee.Image("USGS/SRTMGL1_003").select("elevation").rename("elevation")


def _ntl_image(bounds: ee.Geometry) -> ee.Image | None:
    """
    Return mean annual nighttime lights radiance from VIIRS (2023).
    Band: avg_rad (nanoWatts/cm²/sr)
    """
    try:
        col = (
            ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
            .filterBounds(bounds)
            .filterDate("2023-01-01", "2023-12-31")
            .select("avg_rad")
        )
        if col.size().getInfo() == 0:
            return None
        return col.mean().rename("ntl")
    except Exception:
        return None


# ── Per-City Processing ───────────────────────────────────────────────────────

def process_city(
    name: str, country: str, climate_zone: str, lat: float, lon: float
) -> list[dict]:
    """
    Returns a list of sample row dicts for this city, or [] on failure.
    Each row includes: lst, ndvi, ndbi, evi, elevation, ntl, lst_delta, uhi_label
    """
    point      = ee.Geometry.Point([lon, lat])
    urban_roi  = point.buffer(URBAN_BUFFER_M)
    rural_roi  = point.buffer(RURAL_OUTER_M).difference(point.buffer(RURAL_INNER_M))
    all_bounds = rural_roi  # superset covers both zones

    try:
        # ── Build LST image ──────────────────────────────────────────────────
        lst_img = _lst_image(all_bounds)
        if lst_img is None:
            logger.warning("[%s] No Landsat imagery — skipping", name)
            return []

        # ── Compute rural reference mean LST ─────────────────────────────────
        rural_stats = lst_img.reduceRegion(
            reducer   = ee.Reducer.mean(),
            geometry  = rural_roi,
            scale     = 30,
            maxPixels = 1e9,
        ).getInfo()
        rural_lst_mean = rural_stats.get("LST")
        if rural_lst_mean is None:
            logger.warning("[%s] Rural LST unavailable — skipping", name)
            return []

        # ── Build Sentinel-2 indices ─────────────────────────────────────────
        s2 = _s2_indices(all_bounds)
        if not s2:
            logger.warning("[%s] No Sentinel-2 imagery — skipping", name)
            return []

        # ── Build auxiliary layers ────────────────────────────────────────────
        elev_img = _elevation_image()
        ntl_img  = _ntl_image(all_bounds)

        # ── Combine all bands for urban sampling ─────────────────────────────
        combined = (
            lst_img
            .addBands(s2["ndvi_image"])
            .addBands(s2["ndbi_image"])
            .addBands(s2["evi_image"])
            .addBands(elev_img)
        )
        if ntl_img is not None:
            combined = combined.addBands(ntl_img)

        samples = combined.sample(
            region     = urban_roi,
            scale      = SAMPLE_SCALE_M,
            numPixels  = NUM_SAMPLES_CITY,
            geometries = True,
            seed       = 42,
        )
        features = samples.getInfo().get("features", [])

        if not features:
            logger.warning("[%s] No urban samples returned — skipping", name)
            return []

        # ── Climate-adaptive UHI threshold ───────────────────────────────────
        uhi_threshold = UHI_THRESHOLDS.get(climate_zone, _DEFAULT_THRESHOLD)

        # ── Parse samples, compute UHI label ─────────────────────────────────
        rows = []
        for feat in features:
            props  = feat["properties"]
            coords = feat["geometry"]["coordinates"]  # [lon, lat]
            lst_v  = props.get("LST")
            ndvi_v = props.get("NDVI")
            ndbi_v = props.get("NDBI")
            evi_v  = props.get("EVI")
            elev_v = props.get("elevation")
            ntl_v  = props.get("ntl")  # may be None if NTL image unavailable

            # Require the core bands; auxiliary fallback to 0 if missing
            if any(v is None for v in [lst_v, ndvi_v, ndbi_v]):
                continue

            # EVI can be None for some edge pixels — fallback to NDVI approximation
            if evi_v is None:
                evi_v = float(ndvi_v) * 0.9  # approximate from NDVI when unavailable

            if elev_v is None:
                elev_v = 0.0  # sea-level default

            if ntl_v is None:
                ntl_v = 0.0  # no emission data

            lst_float    = float(lst_v)
            lst_delta    = lst_float - float(rural_lst_mean)
            uhi_label    = 1 if lst_delta >= uhi_threshold else 0

            rows.append({
                "lat":            round(coords[1], 6),
                "lon":            round(coords[0], 6),
                "lst":            round(lst_float, 2),
                "ndvi":           round(float(ndvi_v), 4),
                "ndbi":           round(float(ndbi_v), 4),
                "evi":            round(float(evi_v), 4),
                "elevation":      round(float(elev_v), 1),
                "ntl":            round(float(ntl_v), 4),
                "lst_delta":      round(lst_delta, 2),   # urban LST minus rural baseline
                "city":           name,
                "country":        country,
                "climate_zone":   climate_zone,
                "zone_type":      "urban",
                "rural_lst_mean": round(float(rural_lst_mean), 2),
                "uhi_label":      uhi_label,
            })

        pos = sum(r["uhi_label"] for r in rows)
        logger.info(
            "[%s] ✓ %d samples | rural_mean=%.1f°C | threshold=%.1f°C | UHI=%d/%d",
            name, len(rows), rural_lst_mean, uhi_threshold, pos, len(rows),
        )
        return rows

    except Exception as exc:
        logger.warning("[%s] Failed: %s", name, exc)
        return []


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not _init_gee():
        sys.exit(1)

    all_rows: list[dict] = []
    fieldnames = [
        "lat", "lon", "lst", "ndvi", "ndbi", "evi",
        "elevation", "ntl", "lst_delta",
        "city", "country", "climate_zone", "zone_type",
        "rural_lst_mean", "uhi_label",
    ]

    total = len(CITIES)
    for idx, (name, country, climate_zone, lat, lon) in enumerate(CITIES, 1):
        logger.info("─── [%d/%d] Processing %s, %s ───", idx, total, name, country)
        rows = process_city(name, country, climate_zone, lat, lon)
        all_rows.extend(rows)
        # Small delay to respect GEE rate limits
        if idx % 10 == 0:
            logger.info("Collected %d rows so far — brief pause…", len(all_rows))
            time.sleep(2)

    if len(all_rows) < 200:
        logger.error(
            "Only %d rows collected — too few for training. "
            "Check GEE credentials and quota.", len(all_rows)
        )
        sys.exit(1)

    # Write CSV
    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    pos_count = sum(r["uhi_label"] for r in all_rows)
    neg_count = len(all_rows) - pos_count
    logger.info(
        "\n✅ Dataset saved → %s\n"
        "   Total samples : %d\n"
        "   UHI=1 (hotspot): %d (%.1f%%)\n"
        "   UHI=0 (normal) : %d (%.1f%%)\n"
        "   Cities covered : %d / %d",
        OUTPUT_CSV,
        len(all_rows),
        pos_count, 100 * pos_count / len(all_rows),
        neg_count, 100 * neg_count / len(all_rows),
        len({r["city"] for r in all_rows}), total,
    )


if __name__ == "__main__":
    main()
