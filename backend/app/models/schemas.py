"""Pydantic v2 request/response schemas for the UHI API."""

from __future__ import annotations
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


# ── Request Schemas ─────────────────────────────────────────────────────────────

class LocationRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    radius_m: int = Field(default=1000, ge=100, le=10000, description="Analysis radius in metres")


class SimulateRequest(BaseModel):
    current_temp: float = Field(..., description="Current surface temperature in °C")
    actions: List[str] = Field(
        ...,
        description="List of mitigation action keys: 'trees', 'cool_roof', 'water', 'green_roof'"
    )
    intensities: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional per-action intensity 0–100. Defaults to 100 (full implementation)."
    )


# ── Sub-schemas ─────────────────────────────────────────────────────────────────

class EnvironmentalData(BaseModel):
    lst_celsius: float
    ndvi: float
    ndbi: float


class CauseItem(BaseModel):
    id: str
    label: str
    icon: str
    description: str


class RecommendationItem(BaseModel):
    action: str
    explanation: str
    impact_celsius: float
    type: str   # "vegetation" | "infrastructure" | "water" | "mixed"


class AnalysisResult(BaseModel):
    heat_classification: str       # "Low" | "Medium" | "High"
    vegetation_level: str          # "Low" | "Moderate" | "High"
    urban_density: str             # "Low" | "Moderate" | "High"
    uhi_detected: bool
    causes: List[CauseItem]
    recommendations: List[RecommendationItem]
    estimated_reduction_celsius: float


class SimulationBreakdown(BaseModel):
    action: str
    label: str
    reduction: float
    intensity: float


# ── Response Schemas ─────────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    coordinates: Dict[str, float]
    environmental_data: EnvironmentalData
    analysis: AnalysisResult


class SimulateResponse(BaseModel):
    current_temp: float
    predicted_temp: float
    reduction: float
    breakdown: List[SimulationBreakdown]


# ── ML-specific schemas ──────────────────────────────────────────────────────────

class MLAnalyzeRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    radius_m: int = Field(default=1000, ge=100, le=10000, description="Analysis radius in metres")


class MLEnvironmentalData(BaseModel):
    lst_celsius: float     = Field(..., description="Land Surface Temperature in °C (Landsat 8/9)")
    ndvi: float            = Field(..., description="Normalized Difference Vegetation Index (Sentinel-2)")
    ndbi: float            = Field(..., description="Normalized Difference Built-up Index (Sentinel-2)")
    data_source: str       = Field(..., description="'gee' | 'partial_fallback' | 'fallback'")
    # v2 extended features
    evi: Optional[float]            = Field(default=None, description="Enhanced Vegetation Index (Sentinel-2)")
    elevation: Optional[float]      = Field(default=None, description="Mean elevation in metres (NASA SRTM 30m)")
    ntl: Optional[float]            = Field(default=None, description="Nighttime lights radiance nW/cm²/sr (VIIRS)")
    rural_lst_mean: Optional[float] = Field(default=None, description="Rural buffer mean LST °C (3–15 km annulus)")
    lst_delta: Optional[float]      = Field(default=None, description="Urban-rural LST anomaly °C (lst - rural_lst_mean)")


class MLAnalyzeResponse(BaseModel):
    coordinates: Dict[str, float]
    environmental_data: MLEnvironmentalData
    # Classifier outputs
    uhi_detected: bool        = Field(..., description="True if the XGBoost classifier labels location as UHI")
    uhi_probability: float    = Field(..., description="Probability of UHI (0–1) from classifier")
    model_confidence: str     = Field(..., description="'high' | 'medium' | 'low'")
    model_version: str        = Field(default="v2", description="ML pipeline version — v1 (3 features) or v2 (6 features)")
    # Regressor outputs
    predicted_temperature: float = Field(..., description="LST predicted by RF regressor from NDVI/NDBI/etc.")
    # Combined score
    uhi_score: float          = Field(..., description="Composite UHI severity score 0–1")
    # Optional diagnostics
    feature_importance: Optional[Dict[str, float]] = Field(
        default=None, description="Classifier feature importance (lst_delta, ndvi, ndbi, evi, elevation, ntl)"
    )
    shap_values: Optional[Dict[str, float]] = Field(
        default=None, description="SHAP feature contributions for the specific prediction"
    )
    shap_base_value: Optional[float] = Field(
        default=None, description="SHAP expected value (base value) for the classifier"
    )


class MLSimulateRequest(BaseModel):
    ndvi: float         = Field(..., ge=-1.0, le=1.0, description="Current NDVI value")
    ndbi: float         = Field(..., ge=-1.0, le=1.0, description="Current NDBI value")
    actions: List[str]  = Field(..., description="Mitigation actions: 'trees', 'cool_roof', 'water', 'green_roof'")
    lst_celsius: Optional[float]             = Field(default=None, description="Actual GEE LST to use as baseline (°C)")
    lat: float                               = Field(default=0.0, description="Latitude for climate-zone proxy")
    intensities: Optional[Dict[str, float]]  = Field(default=None, description="Per-action intensity 0-100")
    # v2 extended features for regressor (optional — improves prediction accuracy)
    evi: Optional[float]            = Field(default=None, description="Enhanced Vegetation Index")
    elevation: Optional[float]      = Field(default=None, description="Elevation in metres (SRTM)")
    ntl: Optional[float]            = Field(default=None, description="Nighttime lights radiance (VIIRS)")
    rural_lst_mean: Optional[float] = Field(default=None, description="Rural buffer mean LST °C (for regressor)")


class MLSimulateActionBreakdown(BaseModel):
    action: str
    label: str
    reduction: float
    intensity: float


class MLSimulateResponse(BaseModel):
    original_temperature: float  = Field(..., description="Baseline LST used (°C)")
    new_temperature: float       = Field(..., description="Predicted temperature after mitigation (°C)")
    temperature_reduction: float = Field(..., description="Net cooling achieved (°C)")
    modified_ndvi: float         = Field(..., description="NDVI after applying action deltas")
    modified_ndbi: float         = Field(..., description="NDBI after applying action deltas")
    applied_actions: List[str]   = Field(..., description="Actions successfully applied")
    per_action_breakdown: Optional[List[MLSimulateActionBreakdown]] = Field(default=None)


class MLStatusResponse(BaseModel):
    models_ready: bool
    supported_actions: List[str]
    feature_importance: Optional[Dict] = None
