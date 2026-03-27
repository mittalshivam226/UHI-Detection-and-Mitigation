"""GET /api/hotspots — return top-N real GEE thermal hotspots for a map region."""

from __future__ import annotations
from fastapi import APIRouter, Query
from app.services import gee_service

router = APIRouter()


@router.get(
    "/hotspots",
    summary="Get real thermal hotspots for a map region",
    tags=["Analysis"],
)
def get_hotspots(
    lat:       float = Query(..., description="Centre latitude"),
    lon:       float = Query(..., description="Centre longitude"),
    radius_km: float = Query(10.0, ge=1, le=50, description="Bounding radius in km"),
    top_n:     int   = Query(8,    ge=1, le=20,  description="Number of hotspots to return"),
):
    """
    Samples a Landsat 8/9 LST composite across the region and returns the
    top-N hottest pixel locations. Falls back to deterministic demo data
    when GEE is unavailable or the region has no imagery.
    """
    return gee_service.fetch_hotspots(lat=lat, lon=lon, radius_km=radius_km, top_n=top_n)
