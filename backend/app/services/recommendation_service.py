"""
recommendation_service.py — Maps detected causes to actionable mitigation strategies.

Each cause ID from analysis_service maps to one or more recommendations.
Recommendations include a human-readable label, explanation, impact estimate, and type tag.
"""

from __future__ import annotations
from typing import List
from app.models.schemas import RecommendationItem
from app.utils.thresholds import SIMULATION_IMPACTS


# ── Cause → Recommendation mapping ────────────────────────────────────────────

_CAUSE_MAP: dict[str, List[RecommendationItem]] = {
    "low_vegetation": [
        RecommendationItem(
            action="Increase Urban Tree Cover",
            explanation=(
                "Planting trees along streets and in parks provides shade, "
                "evapotranspiration cooling, and reduces solar radiation reaching surfaces. "
                "Street trees alone can lower nearby surface temperatures by 2–4°C."
            ),
            impact_celsius=SIMULATION_IMPACTS["trees"]["max_c"] - 1.0,
            type="vegetation",
        ),
        RecommendationItem(
            action="Establish Urban Green Corridors",
            explanation=(
                "Connecting parks and green spaces creates cooling corridors that "
                "channel natural airflow and reduce the thermal mass of the urban fabric."
            ),
            impact_celsius=1.5,
            type="vegetation",
        ),
    ],
    "moderate_vegetation": [
        RecommendationItem(
            action="Expand Existing Green Spaces",
            explanation=(
                "Increasing the density of the existing urban canopy through targeted "
                "planting campaigns can push vegetation cover into the 'High' category, "
                "providing meaningful additional cooling."
            ),
            impact_celsius=1.5,
            type="vegetation",
        ),
    ],
    "high_buildup": [
        RecommendationItem(
            action="Install Cool / Reflective Roofing",
            explanation=(
                "High-albedo coatings and materials reflect up to 80% of incoming solar "
                "radiation compared to ~5% for standard dark roofing. Cool roofs can lower "
                "roof surface temperatures by 28–33°C and indoor temperatures by 2–5°C."
            ),
            impact_celsius=SIMULATION_IMPACTS["cool_roof"]["min_c"],
            type="infrastructure",
        ),
        RecommendationItem(
            action="Deploy Permeable / Light-Coloured Pavements",
            explanation=(
                "Replacing dark asphalt with light-coloured or permeable surfaces reduces "
                "heat absorption. Permeable pavements also allow stored rainwater to "
                "evaporate, providing additional evaporative cooling."
            ),
            impact_celsius=1.5,
            type="infrastructure",
        ),
    ],
    "moderate_buildup": [
        RecommendationItem(
            action="Apply Reflective Coatings to Existing Roofs",
            explanation=(
                "White or cool-colour elastomeric coatings can be applied to existing flat "
                "roofs at low cost, meaningfully reducing heat absorption without full replacement."
            ),
            impact_celsius=2.0,
            type="infrastructure",
        ),
    ],
    "heat_retention": [
        RecommendationItem(
            action="Add Green Roofs & Vertical Gardens",
            explanation=(
                "Installing vegetated roofing systems insulates buildings, reduces surface "
                "temperatures, and introduces evapotranspiration cooling to the urban core."
            ),
            impact_celsius=SIMULATION_IMPACTS["green_roof"]["min_c"],
            type="mixed",
        ),
        RecommendationItem(
            action="Introduce Water Features",
            explanation=(
                "Fountains, ponds, and misting systems leverage evaporative cooling. "
                "A water body can lower nearby air temperatures by 1–2°C and improve "
                "local humidity levels."
            ),
            impact_celsius=SIMULATION_IMPACTS["water"]["max_c"],
            type="water",
        ),
    ],
    "regional_background": [
        RecommendationItem(
            action="Maintain Current Green Infrastructure",
            explanation=(
                "No significant UHI drivers detected. Continue monitoring and maintaining "
                "existing vegetation and reflective surfaces to preserve the current low-heat status."
            ),
            impact_celsius=0.5,
            type="monitoring",
        ),
    ],
}


def get_recommendations(causes: List) -> List[RecommendationItem]:
    """
    Given a list of CauseItem objects, return a deduplicated list of recommendations.
    Recommendations are ordered by estimated impact (highest first).
    """
    seen_actions: set[str] = set()
    recommendations: List[RecommendationItem] = []

    for cause in causes:
        for reco in _CAUSE_MAP.get(cause.id, []):
            if reco.action not in seen_actions:
                seen_actions.add(reco.action)
                recommendations.append(reco)

    # Sort by impact descending
    recommendations.sort(key=lambda r: r.impact_celsius, reverse=True)
    return recommendations
