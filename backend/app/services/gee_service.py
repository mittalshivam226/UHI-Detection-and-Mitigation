"""
gee_service.py — Google Earth Engine integration (v2).

Responsibilities:
  - Authenticate with GEE using a service account JSON key
  - Fetch Landsat 8/9 imagery and compute Land Surface Temperature (LST) in °C
  - Fetch Sentinel-2 imagery and compute NDVI, NDBI, and EVI
  - Fetch SRTM elevation and VIIRS nighttime lights
  - Compute rural_lst_mean for lst_delta correction
  - Return a clean dict of float values; never expose raw EE objects to callers

v2 additions:
  [+] _fetch_evi()          — Sentinel-2 Enhanced Vegetation Index
  [+] _fetch_elevation()    — NASA SRTM 30m Digital Elevation Model
  [+] _fetch_ntl()          — VIIRS Day/Night Band nighttime lights
  [+] _fetch_rural_lst()    — Mean LST of rural buffer (for lst_delta)
  [+] fetch_environmental_data() returns all 7 features consumed by v2 model
"""

from __future__ import annotations

import json
import os
import logging
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_EXCEPTION
from typing import Optional

import ee

from app.utils.thresholds import (
    DATA_START_DATE, DATA_END_DATE, CLOUD_COVER_MAX,
    DEFAULT_RADIUS_M, LANDSAT_SCALE_M, SENTINEL_SCALE_M,
)

logger = logging.getLogger(__name__)

# Path to the service account credentials file (sits beside the app/ package)
_GEE_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "gee-key.json")
_GEE_KEY_PATH = os.path.normpath(_GEE_KEY_PATH)

_gee_ready: bool = False


def initialize() -> bool:
    """Authenticate with Google Earth Engine. Call once at application startup."""
    global _gee_ready
    if _gee_ready:
        return True

    if not os.path.exists(_GEE_KEY_PATH):
        logger.error("GEE key file not found at %s", _GEE_KEY_PATH)
        return False

    try:
        with open(_GEE_KEY_PATH) as f:
            key_data = json.load(f)
        credentials = ee.ServiceAccountCredentials(key_data["client_email"], _GEE_KEY_PATH)
        ee.Initialize(credentials)
        _gee_ready = True
        logger.info("Earth Engine initialized successfully (service account: %s)", key_data["client_email"])
        return True
    except Exception as exc:
        logger.exception("Failed to initialize Earth Engine: %s", exc)
        return False


def _make_roi(lat: float, lon: float, radius_m: int) -> ee.Geometry:
    return ee.Geometry.Point([lon, lat]).buffer(radius_m)


def _fetch_lst(roi: ee.Geometry) -> Optional[float]:
    """Returns mean Land Surface Temperature in °C for the ROI, or None on failure."""
    try:
        collection = (
            ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
            .filterBounds(roi)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
        )

        # Try Landsat 9 if 8 returns nothing
        if collection.size().getInfo() == 0:
            collection = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                .filterBounds(roi)
                .filterDate(DATA_START_DATE, DATA_END_DATE)
                .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
            )

        image = collection.median()

        # ST_B10: scale factor 0.00341802 + 149.0 → Kelvin; subtract 273.15 → °C
        lst_kelvin = image.select("ST_B10").multiply(0.00341802).add(149.0)
        lst_celsius = lst_kelvin.subtract(273.15)

        result = lst_celsius.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=LANDSAT_SCALE_M,
            maxPixels=1e9,
        ).getInfo()

        value = result.get("ST_B10")
        return round(float(value), 2) if value is not None else None

    except Exception as exc:
        logger.warning("LST fetch failed: %s", exc)
        return None


def _fetch_ndvi_ndbi_evi(roi: ee.Geometry) -> dict:
    """Returns {'ndvi': float, 'ndbi': float, 'evi': float}, or None values on failure."""
    try:
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(roi)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", CLOUD_COVER_MAX)
        )

        image = collection.median()

        # NDVI = (NIR - Red) / (NIR + Red) = (B8 - B4) / (B8 + B4)
        ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
        # NDBI = (SWIR - NIR) / (SWIR + NIR) = (B11 - B8) / (B11 + B8)
        ndbi = image.normalizedDifference(["B11", "B8"]).rename("NDBI")
        # EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)  [Sentinel-2 scaled to 0-1]
        nir  = image.select("B8").divide(10000.0)
        red  = image.select("B4").divide(10000.0)
        blue = image.select("B2").divide(10000.0)
        evi  = nir.subtract(red).multiply(2.5).divide(
            nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)
        ).rename("EVI")

        combined = ndvi.addBands(ndbi).addBands(evi)
        result = combined.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=SENTINEL_SCALE_M,
            maxPixels=1e9,
        ).getInfo()

        evi_val = result.get("EVI")
        # Clip EVI to plausible [-1, 2] range (same as training)
        if evi_val is not None:
            evi_val = max(-1.0, min(2.0, float(evi_val)))

        return {
            "ndvi": round(float(result["NDVI"]), 3) if result.get("NDVI") is not None else None,
            "ndbi": round(float(result["NDBI"]), 3) if result.get("NDBI") is not None else None,
            "evi":  round(evi_val, 3) if evi_val is not None else None,
        }

    except Exception as exc:
        logger.warning("NDVI/NDBI/EVI fetch failed: %s", exc)
        return {"ndvi": None, "ndbi": None, "evi": None}


def _fetch_elevation(roi: ee.Geometry) -> Optional[float]:
    """Return mean elevation (m) from NASA SRTM 30m DEM, or None on failure."""
    try:
        srtm   = ee.Image("USGS/SRTMGL1_003").select("elevation")
        result = srtm.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=30,
            maxPixels=1e9,
        ).getInfo()
        value = result.get("elevation")
        return round(float(value), 1) if value is not None else None
    except Exception as exc:
        logger.warning("Elevation fetch failed: %s", exc)
        return None


def _fetch_ntl(roi: ee.Geometry) -> Optional[float]:
    """
    Return mean nighttime lights radiance from VIIRS Day/Night Band Annual
    composite (nW/cm²/sr), or None on failure.
    """
    try:
        col = (
            ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
            .filterBounds(roi)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .select("avg_rad")
        )
        image  = col.median()
        result = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=500,
            maxPixels=1e9,
        ).getInfo()
        value = result.get("avg_rad")
        return round(float(value), 4) if value is not None else None
    except Exception as exc:
        logger.warning("NTL fetch failed: %s", exc)
        return None


def _fetch_rural_lst(lat: float, lon: float, inner_km: float = 3.0, outer_km: float = 15.0) -> Optional[float]:
    """
    Compute the mean LST of an annular rural buffer (inner_km to outer_km)
    around the point.  Used to derive lst_delta = urban_lst - rural_lst_mean.

    The inner radius excludes the urban core; the outer ring samples
    surrounding (typically less-urbanised) land.
    """
    try:
        inner_m = inner_km * 1000
        outer_m = outer_km * 1000
        center  = ee.Geometry.Point([lon, lat])
        outer   = center.buffer(outer_m)
        inner   = center.buffer(inner_m)
        ring    = outer.difference(inner)

        col = (
            ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
            .filterBounds(ring)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
        )
        if col.size().getInfo() == 0:
            col = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                .filterBounds(ring)
                .filterDate(DATA_START_DATE, DATA_END_DATE)
                .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
            )

        lst_image = (
            col.median()
            .select("ST_B10")
            .multiply(0.00341802)
            .add(149.0)
            .subtract(273.15)
        )

        result = lst_image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=ring,
            scale=LANDSAT_SCALE_M,
            maxPixels=1e9,
        ).getInfo()

        value = result.get("ST_B10")
        return round(float(value), 2) if value is not None else None
    except Exception as exc:
        logger.warning("Rural LST fetch failed: %s", exc)
        return None


# ── Fallback values (used when GEE data is unavailable) ──────────────────────
_FALLBACK = {
    "lst_celsius":    34.5,
    "ndvi":           0.16,
    "ndbi":           0.22,
    "evi":            0.14,
    "elevation":      50.0,
    "ntl":            10.0,
    "rural_lst_mean": 30.0,
}


def fetch_environmental_data(lat: float, lon: float, radius_m: int = DEFAULT_RADIUS_M) -> dict:
    """
    Public API (v2): fetch LST, NDVI, NDBI, EVI, elevation, NTL, and rural LST
    for a given coordinate. All 7 values are needed by the v2 XGBoost model.

    Returns:
        {
            "lst_celsius":    float,   # Landsat LST
            "ndvi":           float,   # Sentinel-2 NDVI
            "ndbi":           float,   # Sentinel-2 NDBI
            "evi":            float,   # Sentinel-2 EVI
            "elevation":      float,   # SRTM elevation (m)
            "ntl":            float,   # VIIRS nighttime lights (nW/cm²/sr)
            "rural_lst_mean": float,   # Mean LST of rural annular buffer
            "lst_delta":      float,   # lst_celsius - rural_lst_mean
            "data_source":    str      # "gee" | "partial_fallback" | "fallback"
        }
    """
    if not _gee_ready:
        logger.warning("GEE not initialized — returning fallback data")
        fb = {**_FALLBACK, "data_source": "fallback"}
        fb["lst_delta"] = fb["lst_celsius"] - fb["rural_lst_mean"]
        return fb

    roi = _make_roi(lat, lon, radius_m)

    # ── Fetch all layers in PARALLEL to minimise total latency ───────────────
    # Individual GEE calls each take 3-8 s.  Sequential = 20-40 s.
    # Parallel wall time ≈ max(individual) = 8-12 s.
    with ThreadPoolExecutor(max_workers=5) as pool:
        f_lst   = pool.submit(_fetch_lst,          roi)
        f_veg   = pool.submit(_fetch_ndvi_ndbi_evi, roi)
        f_elev  = pool.submit(_fetch_elevation,     roi)
        f_ntl   = pool.submit(_fetch_ntl,           roi)
        f_rural = pool.submit(_fetch_rural_lst,      lat, lon)

        # collect with per-future timeout so one slow call never blocks all
        def _safe(future, default):
            try:
                return future.result(timeout=25)
            except Exception as exc:
                logger.warning("GEE parallel fetch failed: %s", exc)
                return default

        lst       = _safe(f_lst,   None)
        veg       = _safe(f_veg,   {"ndvi": None, "ndbi": None, "evi": None})
        elevation = _safe(f_elev,  None)
        ntl       = _safe(f_ntl,   None)
        rural_lst = _safe(f_rural, None)

    # Fill missing values from fallback
    lst_val    = lst               if lst               is not None else _FALLBACK["lst_celsius"]
    ndvi_val   = veg["ndvi"]       if veg["ndvi"]       is not None else _FALLBACK["ndvi"]
    ndbi_val   = veg["ndbi"]       if veg["ndbi"]       is not None else _FALLBACK["ndbi"]
    evi_val    = veg["evi"]        if veg["evi"]        is not None else _FALLBACK["evi"]
    elev_val   = elevation         if elevation         is not None else _FALLBACK["elevation"]
    ntl_val    = ntl               if ntl               is not None else _FALLBACK["ntl"]
    rural_val  = rural_lst         if rural_lst         is not None else _FALLBACK["rural_lst_mean"]

    # lst_delta is the key thermal-anomaly signal for the classifier
    lst_delta  = round(lst_val - rural_val, 3)

    # Determine data quality flag
    gee_core_ok = (lst is not None and veg["ndvi"] is not None)
    data_source = "gee" if gee_core_ok else "partial_fallback"

    result = {
        "lst_celsius":    lst_val,
        "ndvi":           ndvi_val,
        "ndbi":           ndbi_val,
        "evi":            evi_val,
        "elevation":      elev_val,
        "ntl":            ntl_val,
        "rural_lst_mean": rural_val,
        "lst_delta":      lst_delta,
        "data_source":    data_source,
    }

    logger.info(
        "GEE fetch (%.4f, %.4f): LST=%.1f°C  delta=%.1f  NDVI=%.3f  NDBI=%.3f  "
        "EVI=%.3f  Elev=%.0fm  NTL=%.2f  RuralLST=%.1f [%s]",
        lat, lon, lst_val, lst_delta, ndvi_val, ndbi_val,
        evi_val, elev_val, ntl_val, rural_val, data_source,
    )
    return result


def fetch_hotspots(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    top_n: int = 8,
) -> list[dict]:
    """
    Return the top-N hottest locations within a bounding box centred on (lat, lon).

    Strategy:
      1. Build an LST image for the region (Landsat 8/9 median composite)
      2. Sample the image at a regular grid of ~200 points covering the bounding box
      3. Keep only valid (non-null) samples
      4. Sort by temperature descending and return the top-N

    Returns a list of dicts:
        [{"lat": float, "lon": float, "temp": float, "name": str}, ...]
    """
    if not _gee_ready:
        logger.warning("GEE not ready — returning fallback hotspots")
        return _fallback_hotspots(lat, lon)

    try:
        # ── 1. Bounding box ──────────────────────────────────────────────────
        deg = radius_km / 111.0  # rough degree offset per km
        bbox = ee.Geometry.BBox(lon - deg, lat - deg, lon + deg, lat + deg)

        # ── 2. LST image (same logic as _fetch_lst) ─────────────────────────
        def _lst_collection(collection_id: str):
            return (
                ee.ImageCollection(collection_id)
                .filterBounds(bbox)
                .filterDate(DATA_START_DATE, DATA_END_DATE)
                .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
            )

        col = _lst_collection("LANDSAT/LC08/C02/T1_L2")
        if col.size().getInfo() == 0:
            col = _lst_collection("LANDSAT/LC09/C02/T1_L2")

        lst_image = (
            col.median()
            .select("ST_B10")
            .multiply(0.00341802)
            .add(149.0)
            .subtract(273.15)
            .rename("LST")
        )

        # ── 3. Sample the image on a regular grid ───────────────────────────
        samples = lst_image.sample(
            region=bbox,
            scale=500,          # 500 m grid → ~(2*radius_km / 0.5)² points max
            numPixels=300,      # hard cap to keep latency low
            geometries=True,    # include point geometry in output
            seed=42,
        )

        features = samples.getInfo().get("features", [])

        if not features:
            logger.warning("No GEE hotspot samples returned — using fallback")
            return _fallback_hotspots(lat, lon)

        # ── 4. Parse, filter, sort ───────────────────────────────────────────
        points = []
        for feat in features:
            lst_val = feat["properties"].get("LST")
            coords   = feat["geometry"]["coordinates"]  # [lon, lat]
            if lst_val is not None:
                points.append({
                    "lat":  round(coords[1], 5),
                    "lon":  round(coords[0], 5),
                    "temp": round(float(lst_val), 1),
                })

        points.sort(key=lambda p: p["temp"], reverse=True)
        top = points[:top_n]

        # Attach auto-generated names based on ordinal ranking
        severity = ["Critical", "Severe", "High", "Moderate", "Notable",
                    "Elevated", "Warm", "Mild"]
        for i, pt in enumerate(top):
            pt["name"] = f"{severity[min(i, len(severity)-1)]} Zone {i + 1}"

        logger.info(
            "Hotspot fetch for (%.3f, %.3f) r=%.1fkm → %d samples, top %d: %.1f–%.1f°C",
            lat, lon, radius_km, len(points), len(top),
            top[0]["temp"] if top else 0, top[-1]["temp"] if top else 0,
        )
        return top

    except Exception as exc:
        logger.exception("fetch_hotspots failed: %s", exc)
        return _fallback_hotspots(lat, lon)


def get_layer_tile_url(layer: str, lat: float, lon: float, radius_km: float = 150.0) -> dict:
    """
    Generate a GEE tile URL template for a given layer type.
    Returns tile_url (with {z}/{x}/{y}), min, max, unit, palette.
    """
    if not _gee_ready:
        raise RuntimeError("GEE not initialized")

    deg = radius_km / 111.0
    bbox = ee.Geometry.BBox(lon - deg, lat - deg, lon + deg, lat + deg)

    if layer == "lst":
        col = (
            ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
            .filterBounds(bbox)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
        )
        if col.size().getInfo() == 0:
            col = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                .filterBounds(bbox)
                .filterDate(DATA_START_DATE, DATA_END_DATE)
                .filterMetadata("CLOUD_COVER", "less_than", CLOUD_COVER_MAX)
            )
        image = (
            col.median().select("ST_B10")
            .multiply(0.00341802).add(149.0).subtract(273.15)
            .rename("LST")
        )
        # Standard thermal palette: cool blue → cyan → green → yellow → orange → red (hot)
        _LST_PAL = ["#040080","#0000cd","#0080ff","#00d0ff","#00ffb0",
                    "#80ff00","#ffff00","#ffa000","#ff4000","#cc0000"]
        viz = {"bands": ["LST"], "min": "15", "max": "55", "palette": _LST_PAL}
        meta = {"min": 15, "max": 55, "unit": "°C", "palette": _LST_PAL}

    elif layer == "ndvi":
        col = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(bbox)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", CLOUD_COVER_MAX)
        )
        image = col.median().normalizedDifference(["B8", "B4"]).rename("NDVI")
        # Standard NDVI palette: bare/urban (brown-red) → sparse (yellow) → dense vegetation (dark green)
        _NDVI_PAL = ["#8b4513","#c8a060","#e8d080","#f5f5a0",
                     "#b8e060","#78c830","#3a9820","#1a6810","#004000"]
        viz = {"bands": ["NDVI"], "min": "-0.2", "max": "0.8", "palette": _NDVI_PAL}
        meta = {"min": -0.2, "max": 0.8, "unit": "index", "palette": _NDVI_PAL}

    elif layer == "ndbi":
        col = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(bbox)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
            .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", CLOUD_COVER_MAX)
        )
        image = col.median().normalizedDifference(["B11", "B8"]).rename("NDBI")
        # Standard NDBI palette: water/veg (dark blue) → bare soil (tan) → dense urban (bright yellow/white)
        _NDBI_PAL = ["#001060","#0040a0","#2080d0","#80c0e0","#e0e0a0",
                     "#d0b050","#cc8000","#c04000","#a00000","#ffff80"]
        viz = {"bands": ["NDBI"], "min": "-0.5", "max": "0.5", "palette": _NDBI_PAL}
        meta = {"min": -0.5, "max": 0.5, "unit": "index", "palette": _NDBI_PAL}

    elif layer == "ntl":
        col = (
            ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
            .filterBounds(bbox)
            .filterDate(DATA_START_DATE, DATA_END_DATE)
        )
        image = col.median().select("avg_rad").rename("NTL")
        # NTL palette: dark (black/blue) -> bright (yellow/white)
        _NTL_PAL = ["#000000", "#1a0b2e", "#440154", "#3b528b", "#21908c", "#5dc863", "#fde725", "#ffffff"]
        viz = {"bands": ["NTL"], "min": "0", "max": "60", "palette": _NTL_PAL}
        meta = {"min": 0, "max": 60, "unit": "nW/cm²", "palette": _NTL_PAL}

    else:
        raise ValueError(f"Unknown layer: {layer!r}. Must be 'lst', 'ndvi', 'ndbi', or 'ntl'.")

    map_id = ee.data.getMapId({"image": image, **viz})
    tile_url: str = map_id["tile_fetcher"].url_format
    logger.info("Generated tile URL for layer=%s around (%.3f,%.3f)", layer, lat, lon)
    return {"tile_url": tile_url, "layer": layer, **meta}


def _fallback_hotspots(lat: float, lon: float) -> list[dict]:
    """Deterministic demo hotspots centred on the given coordinate."""
    import random, math
    rng = random.Random(int(lat * 1000 + lon * 1000))

    def _jitter(scale: float) -> float:
        return (rng.random() - 0.5) * scale * 2

    severity = ["Critical", "Severe", "High", "Moderate", "Notable", "Elevated", "Warm", "Mild"]
    hotspots = []
    for i in range(8):
        temp = round(42 - i * 1.2 + rng.uniform(-0.5, 0.5), 1)
        hotspots.append({
            "lat":  round(lat + _jitter(0.06), 5),
            "lon":  round(lon + _jitter(0.06), 5),
            "temp": temp,
            "name": f"{severity[i]} Zone {i + 1}",
        })
    return hotspots

