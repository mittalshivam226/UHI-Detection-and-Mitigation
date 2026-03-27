# Central configuration for all UHI classification thresholds and simulation parameters.
# Change values here to tune the system without touching business logic files.

# ── Land Surface Temperature thresholds (°C) ──────────────────────────────────
LST_THRESHOLD_HIGH = 35.0   # Above this → High heat classification
LST_THRESHOLD_MED  = 30.0   # Above this → Medium heat classification

# ── Vegetation Index (NDVI) thresholds ─────────────────────────────────────────
NDVI_THRESHOLD_LOW = 0.20   # Below this → Low vegetation
NDVI_THRESHOLD_MED = 0.40   # Below this → Moderate vegetation (else High)

# ── Built-up Index (NDBI) thresholds ───────────────────────────────────────────
NDBI_THRESHOLD_HIGH = 0.10  # Above this → High urban density
NDBI_THRESHOLD_MED  = -0.10 # Above this → Moderate density (else Low)

# ── UHI Detection: combined condition flags ────────────────────────────────────
# A location is flagged as a UHI hotspot when BOTH:
UHI_LST_MIN  = 33.0         # LST must exceed this
UHI_NDVI_MAX = 0.25         # AND NDVI must be below this

# ── Satellite data fetch window ────────────────────────────────────────────────
DATA_START_DATE = "2023-01-01"
DATA_END_DATE   = "2024-06-30"
CLOUD_COVER_MAX = 20          # % cloud cover filter for both Landsat and Sentinel

# ── GEE fetch radius and scale ─────────────────────────────────────────────────
DEFAULT_RADIUS_M  = 1000      # Buffer around point (metres)
LANDSAT_SCALE_M   = 30        # Spatial resolution for Landsat (LST)
SENTINEL_SCALE_M  = 10        # Spatial resolution for Sentinel-2 (NDVI/NDBI)

# ── Simulation impact per mitigation action (°C reduction) ─────────────────────
# Values represent the cooling effect at 100% implementation.
# The simulation service scales linearly with intensity (0–100%).
SIMULATION_IMPACTS = {
    "trees": {
        "label":       "Increase Tree Cover",
        "description": "Urban tree canopy provides shade, evapotranspiration, and wind buffering.",
        "min_c": 2.0,
        "max_c": 4.0,
    },
    "cool_roof": {
        "label":       "Cool / Reflective Roofing",
        "description": "High-albedo coatings reduce solar heat absorption by roofs by up to 80%.",
        "min_c": 4.0,
        "max_c": 6.0,
    },
    "water": {
        "label":       "Introduce Water Features",
        "description": "Ponds, fountains, and permeable surfaces reduce heat via evaporative cooling.",
        "min_c": 1.0,
        "max_c": 2.0,
    },
    "green_roof": {
        "label":       "Green Roofs & Vertical Gardens",
        "description": "Vegetation on rooftops insulates buildings and reduces the urban heat load.",
        "min_c": 1.5,
        "max_c": 3.0,
    },
}
