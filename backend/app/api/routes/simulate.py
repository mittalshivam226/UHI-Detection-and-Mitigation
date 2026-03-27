"""POST /simulate — compute projected temperature after mitigation actions."""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import SimulateRequest, SimulateResponse
from app.services import simulation_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse, summary="Simulate temperature reduction from mitigation actions")
def simulate_impact(req: SimulateRequest) -> SimulateResponse:
    """
    Given a current temperature and a list of mitigation action keys,
    return the projected temperature and per-action cooling breakdown.

    Supported action keys: `trees`, `cool_roof`, `water`, `green_roof`

    Optionally supply `intensities` (0–100 per action) to model partial implementation.
    Omitting intensities assumes 100% (full implementation).
    """
    if not req.actions:
        raise HTTPException(status_code=422, detail="At least one action must be provided.")

    try:
        return simulation_service.simulate(
            current_temp=req.current_temp,
            actions=req.actions,
            intensities=req.intensities,
        )
    except Exception as exc:
        logger.exception("simulate failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}")


@router.get("/simulate/actions", summary="List all available mitigation actions")
def list_actions() -> list:
    """Returns all supported mitigation action keys with labels and cooling impact ranges."""
    return simulation_service.list_available_actions()
