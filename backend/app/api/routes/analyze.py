"""POST /analyze-location — orchestrates GEE fetch → analysis → recommendations."""

from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException

from app.models.schemas import LocationRequest, AnalyzeResponse, EnvironmentalData, AnalysisResult
from app.services import gee_service, analysis_service, recommendation_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze-location", response_model=AnalyzeResponse, summary="Analyze UHI conditions at a location")
def analyze_location(req: LocationRequest) -> AnalyzeResponse:
    """
    Fetch satellite data for the given coordinates and return a full UHI analysis:
    - Land Surface Temperature (Landsat 8/9)
    - NDVI and NDBI (Sentinel-2)
    - Heat / vegetation / urban-density classification
    - UHI hotspot detection flag
    - Cause diagnosis
    - Mitigation recommendations
    """
    try:
        # 1. Fetch raw satellite data
        raw = gee_service.fetch_environmental_data(req.lat, req.lon, req.radius_m)

        lst   = raw["lst_celsius"]
        ndvi  = raw["ndvi"]
        ndbi  = raw["ndbi"]

        # 2. Analyse conditions
        analysis_dict = analysis_service.analyze(lst, ndvi, ndbi)

        # 3. Generate recommendations from detected causes
        recommendations = recommendation_service.get_recommendations(analysis_dict["causes"])
        estimated_reduction = round(sum(r.impact_celsius for r in recommendations), 2)

        return AnalyzeResponse(
            coordinates={"lat": req.lat, "lon": req.lon, "radius_m": req.radius_m},
            environmental_data=EnvironmentalData(
                lst_celsius=lst,
                ndvi=ndvi,
                ndbi=ndbi,
            ),
            analysis=AnalysisResult(
                heat_classification=analysis_dict["heat_classification"],
                vegetation_level=analysis_dict["vegetation_level"],
                urban_density=analysis_dict["urban_density"],
                uhi_detected=analysis_dict["uhi_detected"],
                causes=analysis_dict["causes"],
                recommendations=recommendations,
                estimated_reduction_celsius=estimated_reduction,
            ),
        )

    except Exception as exc:
        logger.exception("analyze-location failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
