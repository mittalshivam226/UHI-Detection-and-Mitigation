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
