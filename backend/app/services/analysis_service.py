"""
analysis_service.py — UHI Detection and Environmental Analysis Engine.

Responsibilities:
  - Classify LST, NDVI, NDBI into human-readable levels
  - Detect whether a location qualifies as a UHI hotspot
  - Identify the specific environmental causes of heat
"""

from __future__ import annotations
from typing import List
from app.utils.thresholds import (
    LST_THRESHOLD_HIGH, LST_THRESHOLD_MED,
    NDVI_THRESHOLD_LOW, NDVI_THRESHOLD_MED,
    NDBI_THRESHOLD_HIGH, NDBI_THRESHOLD_MED,
    UHI_LST_MIN, UHI_NDVI_MAX,
)
from app.models.schemas import CauseItem


# ── Feature Classification ─────────────────────────────────────────────────────

def classify_heat(lst: float) -> str:
    """Low / Medium / High based on LST thresholds."""
    if lst >= LST_THRESHOLD_HIGH:
        return "High"
    if lst >= LST_THRESHOLD_MED:
        return "Medium"
    return "Low"


def classify_vegetation(ndvi: float) -> str:
    """Low / Moderate / High based on NDVI thresholds."""
    if ndvi < NDVI_THRESHOLD_LOW:
        return "Low"
    if ndvi < NDVI_THRESHOLD_MED:
        return "Moderate"
    return "High"


def classify_urban_density(ndbi: float) -> str:
    """Low / Moderate / High based on NDBI thresholds."""
    if ndbi >= NDBI_THRESHOLD_HIGH:
        return "High"
    if ndbi >= NDBI_THRESHOLD_MED:
        return "Moderate"
    return "Low"


# ── UHI Detection ──────────────────────────────────────────────────────────────

def detect_uhi(lst: float, ndvi: float) -> bool:
    """
    A location is classified as a UHI hotspot when both:
      - LST exceeds the UHI minimum threshold, AND
      - NDVI falls below the UHI vegetation maximum threshold
    """
    return lst >= UHI_LST_MIN and ndvi <= UHI_NDVI_MAX


# ── Cause Detection ────────────────────────────────────────────────────────────

def identify_causes(lst: float, ndvi: float, ndbi: float) -> List[CauseItem]:
    """
    Return a structured list of detected environmental causes contributing to heat.
    Each cause maps to a recommendation in the recommendation service.
    """
    causes: List[CauseItem] = []

    veg_level = classify_vegetation(ndvi)
    density_level = classify_urban_density(ndbi)
    heat_level = classify_heat(lst)

    if veg_level == "Low":
        causes.append(CauseItem(
            id="low_vegetation",
            label="Low Vegetation Coverage",
            icon="🌿",
            description=(
                f"NDVI of {ndvi:.2f} indicates sparse vegetation. "
                "Urban areas with little to no tree canopy absorb significantly "
                "more solar radiation, raising surface temperatures."
            ),
        ))
    elif veg_level == "Moderate":
        causes.append(CauseItem(
            id="moderate_vegetation",
            label="Insufficient Urban Canopy",
            icon="🌳",
            description=(
                f"NDVI of {ndvi:.2f} suggests moderate vegetation, "
                "but higher canopy density would provide greater cooling."
            ),
        ))

    if density_level == "High":
        causes.append(CauseItem(
            id="high_buildup",
            label="High Built-Up Density",
            icon="🏙️",
            description=(
                f"NDBI of {ndbi:.2f} indicates a dense built environment. "
                "Concrete, asphalt, and rooftops absorb and re-radiate heat, "
                "creating a thermal mass effect that elevates nighttime temperatures."
            ),
        ))
    elif density_level == "Moderate":
        causes.append(CauseItem(
            id="moderate_buildup",
            label="Moderate Urban Infrastructure",
            icon="🏢",
            description=(
                "Moderate built-up density contributes to heat absorption. "
                "Reflective coatings would meaningfully reduce surface temperatures."
            ),
        ))

    if heat_level == "High" and lst >= LST_THRESHOLD_HIGH:
        causes.append(CauseItem(
            id="heat_retention",
            label="Heat Retention Surfaces",
            icon="🌡️",
            description=(
                f"Surface temperature of {lst:.1f}°C indicates materials "
                "that strongly absorb solar radiation (dark pavements, metal roofs). "
                "These surfaces re-emit heat as infrared radiation throughout the day."
            ),
        ))

    if not causes:
        causes.append(CauseItem(
            id="regional_background",
            label="Regional Background Temperature",
            icon="☀️",
            description=(
                "No critical UHI drivers detected. Elevated temperatures are primarily "
                "driven by regional climate conditions rather than local land-use factors."
            ),
        ))

    return causes


# ── Main Orchestrator ──────────────────────────────────────────────────────────

def analyze(lst: float, ndvi: float, ndbi: float) -> dict:
    """
    Orchestrate full UHI analysis.

    Returns a dict with classification levels, UHI flag, and detected causes.
    """
    return {
        "heat_classification": classify_heat(lst),
        "vegetation_level":    classify_vegetation(ndvi),
        "urban_density":       classify_urban_density(ndbi),
        "uhi_detected":        detect_uhi(lst, ndvi),
        "causes":              identify_causes(lst, ndvi, ndbi),
    }
