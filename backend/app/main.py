"""
app/main.py — FastAPI application factory (v2 Modular Backend).

Registers all routers, CORS middleware, startup events, and the health check endpoint.
"""

from __future__ import annotations
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analyze, simulate, hotspots
from app.services import gee_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# Create the FastAPI application
app = FastAPI(
    title="Urban Heat Intelligence System API",
    description=(
        "Geospatial intelligence backend: fetches satellite data from Google Earth Engine, "
        "detects Urban Heat Island hotspots, diagnoses causes, and recommends mitigations."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(analyze.router,   prefix="/api", tags=["Analysis"])
app.include_router(simulate.router,  prefix="/api", tags=["Simulation"])
app.include_router(hotspots.router,  prefix="/api", tags=["Hotspots"])


# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    ok = gee_service.initialize()
    if ok:
        logger.info("✅ Google Earth Engine ready")
    else:
        logger.warning("⚠️  GEE init failed — responses will use fallback data")


# ── Core endpoints ───────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/", tags=["System"])
def root():
    return {
        "service": "Urban Heat Intelligence System API",
        "version": "2.0.0",
        "docs": "/docs",
        "routes": ["/api/analyze-location", "/api/simulate", "/api/simulate/actions"],
    }
