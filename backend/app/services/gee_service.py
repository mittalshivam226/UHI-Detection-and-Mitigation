"""
gee_service.py — Google Earth Engine integration.

Responsibilities:
  - Authenticate with GEE using a service account JSON key
  - Fetch Landsat 8/9 imagery and compute Land Surface Temperature (LST) in °C
  - Fetch Sentinel-2 imagery and compute NDVI and NDBI
  - Return a clean dict of float values; never expose raw EE objects to callers
"""

from __future__ import annotations

import json
import os
import logging
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


def _fetch_ndvi_ndbi(roi: ee.Geometry) -> dict:
    """Returns {'ndvi': float, 'ndbi': float}, or None values on failure."""
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
        # NDBI = (SWIR - NIR)  / (SWIR + NIR) = (B11 - B8) / (B11 + B8)
        ndbi = image.normalizedDifference(["B11", "B8"]).rename("NDBI")

        combined = ndvi.addBands(ndbi)
        result = combined.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=SENTINEL_SCALE_M,
            maxPixels=1e9,
        ).getInfo()

        return {
            "ndvi": round(float(result["NDVI"]), 3) if result.get("NDVI") is not None else None,
            "ndbi": round(float(result["NDBI"]), 3) if result.get("NDBI") is not None else None,
        }

    except Exception as exc:
        logger.warning("NDVI/NDBI fetch failed: %s", exc)
        return {"ndvi": None, "ndbi": None}


# ── Fallback values (used when GEE data is unavailable) ──────────────────────
_FALLBACK = {"lst_celsius": 34.5, "ndvi": 0.16, "ndbi": 0.22}


def fetch_environmental_data(lat: float, lon: float, radius_m: int = DEFAULT_RADIUS_M) -> dict:
    """
    Public API: fetch LST, NDVI, and NDBI for a given coordinate.

    Returns:
        {
            "lst_celsius": float,
            "ndvi": float,
            "ndbi": float,
            "data_source": "gee" | "fallback"
        }
    """
    if not _gee_ready:
        logger.warning("GEE not initialized — returning fallback data")
        return {**_FALLBACK, "data_source": "fallback"}

    roi = _make_roi(lat, lon, radius_m)

    lst = _fetch_lst(roi)
    veg = _fetch_ndvi_ndbi(roi)

    # If any value is missing, fill from fallback
    result = {
        "lst_celsius": lst if lst is not None else _FALLBACK["lst_celsius"],
        "ndvi":        veg["ndvi"] if veg["ndvi"] is not None else _FALLBACK["ndvi"],
        "ndbi":        veg["ndbi"] if veg["ndbi"] is not None else _FALLBACK["ndbi"],
        "data_source": "gee" if (lst is not None and veg["ndvi"] is not None) else "partial_fallback",
    }

    logger.info("GEE fetch for (%.4f, %.4f): LST=%.1f°C  NDVI=%.3f  NDBI=%.3f",
                lat, lon, result["lst_celsius"], result["ndvi"], result["ndbi"])
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

    else:
        raise ValueError(f"Unknown layer: {layer!r}. Must be 'lst', 'ndvi', or 'ndbi'.")

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

