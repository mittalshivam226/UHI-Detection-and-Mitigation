"""GET /api/layer-tiles — returns a GEE tile URL template for map overlay layers."""

from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Query

from app.services import gee_service

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_LAYERS = {"lst", "ndvi", "ndbi"}


@router.get("/layer-tiles", summary="Get GEE tile URL for a satellite layer")
def get_layer_tiles(
    layer: str = Query(..., description="Layer type: lst | ndvi | ndbi"),
    lat: float = Query(..., description="Centre latitude"),
    lon: float = Query(..., description="Centre longitude"),
    radius_km: float = Query(150.0, description="Radius in km around centre"),
):
    """
    Returns a GEE tile URL template (with {z}/{x}/{y}) for the requested layer,
    along with the visualization parameters (min, max, unit, palette).

    Layers:
    - **lst** — Land Surface Temperature in °C (Landsat 8/9)
    - **ndvi** — Normalized Difference Vegetation Index (Sentinel-2)
    - **ndbi** — Normalized Difference Built-Up Index (Sentinel-2)
    """
    if layer not in VALID_LAYERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layer '{layer}'. Must be one of: {sorted(VALID_LAYERS)}",
        )

    try:
        result = gee_service.get_layer_tile_url(layer, lat, lon, radius_km)
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("layer-tiles failed for layer=%s: %s", layer, exc)
        raise HTTPException(status_code=500, detail=f"Tile generation failed: {exc}")
