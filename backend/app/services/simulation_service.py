"""
simulation_service.py — Temperature Reduction Impact Simulator.

Calculates the projected temperature after applying one or more mitigation actions.
Each action has a configurable min/max cooling range (from thresholds.py).
Intensity (0–100%) scales the effect linearly between min and max.
"""

from __future__ import annotations
from typing import List, Dict, Optional

from app.utils.thresholds import SIMULATION_IMPACTS
from app.models.schemas import SimulationBreakdown, SimulateResponse


def simulate(
    current_temp: float,
    actions: List[str],
    intensities: Optional[Dict[str, float]] = None,
) -> SimulateResponse:
    """
    Compute projected temperature reduction for a set of mitigation actions.

    Args:
        current_temp:  Current surface temperature in °C.
        actions:       List of action keys (e.g. ["trees", "cool_roof"]).
        intensities:   Optional dict mapping action key → intensity 0–100.
                       Defaults to 100 (full implementation) for each action.

    Returns:
        SimulateResponse with predicted_temp, total reduction, and per-action breakdown.
    """
    if intensities is None:
        intensities = {}

    total_reduction = 0.0
    breakdown: List[SimulationBreakdown] = []

    seen = set()
    for action_key in actions:
        if action_key in seen:
            continue        # skip duplicates
        seen.add(action_key)

        config = SIMULATION_IMPACTS.get(action_key)
        if config is None:
            continue        # unknown action — silently skip

        intensity = max(0.0, min(100.0, intensities.get(action_key, 100.0)))

        # Linear interpolation between min_c and max_c based on intensity
        reduction = config["min_c"] + (config["max_c"] - config["min_c"]) * (intensity / 100.0)
        reduction = round(reduction, 2)

        total_reduction += reduction
        breakdown.append(SimulationBreakdown(
            action=action_key,
            label=config["label"],
            reduction=reduction,
            intensity=intensity,
        ))

    total_reduction = round(total_reduction, 2)
    predicted_temp  = round(max(current_temp - total_reduction, 15.0), 1)   # floor at 15°C

    # Sort breakdown by reduction descending
    breakdown.sort(key=lambda b: b.reduction, reverse=True)

    return SimulateResponse(
        current_temp=current_temp,
        predicted_temp=predicted_temp,
        reduction=total_reduction,
        breakdown=breakdown,
    )


def list_available_actions() -> List[dict]:
    """Return all supported mitigation actions with their labels and impact ranges."""
    return [
        {
            "key":         key,
            "label":       cfg["label"],
            "description": cfg["description"],
            "min_c":       cfg["min_c"],
            "max_c":       cfg["max_c"],
        }
        for key, cfg in SIMULATION_IMPACTS.items()
    ]
