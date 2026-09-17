"""
FastAPI backend for the Flood Probability Prediction app.

Endpoints:
  GET  /api/meta      -> feature list, ranges, model info (drives the frontend form)
  POST /api/predict   -> { features: {...20 values...} } -> prediction + risk level
  GET  /api/health    -> liveness check

In production (Docker image) this process also serves the built React
frontend as static files, so the whole app is a single container/service.
"""

import json
import pickle
from pathlib import Path
from typing import Dict

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, create_model

HERE = Path(__file__).parent
MODEL_DIR = HERE / "model"
STATIC_DIR = HERE / "static"  # built React app is copied here by the Dockerfile

with open(MODEL_DIR / "meta.json") as f:
    META = json.load(f)

FEATURE_NAMES = META["feature_names"]

with open(MODEL_DIR / "model.pkl", "rb") as f:
    MODEL = pickle.load(f)
with open(MODEL_DIR / "scaler.pkl", "rb") as f:
    SCALER = pickle.load(f)

app = FastAPI(title="Flood Probability Prediction API", version="1.0.0")

# CORS is only needed for local dev (React on :5173 calling API on :8000).
# In the deployed single-container setup, frontend and API share an origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build a Pydantic model with one required float field per dataset feature,
# so requests are validated (types + presence) without hand-writing 20 fields.
_field_defs = {name: (float, Field(..., ge=0, le=25)) for name in FEATURE_NAMES}
FeaturesIn = create_model("FeaturesIn", **_field_defs)


class PredictRequest(BaseModel):
    features: FeaturesIn


def risk_level(probability: float) -> Dict[str, str]:
    """Bucket the predicted probability into a human-readable risk category."""
    if probability < 0.40:
        return {"label": "Low", "color": "#22c55e"}
    if probability < 0.50:
        return {"label": "Moderate", "color": "#eab308"}
    if probability < 0.60:
        return {"label": "High", "color": "#f97316"}
    return {"label": "Severe", "color": "#ef4444"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def get_meta():
    return {
        "feature_names": FEATURE_NAMES,
        "feature_ranges": META["feature_ranges"],
        "target_range": META["target_range"],
        "best_model": META["best_model"],
        "metrics": META["metrics"],
    }


@app.post("/api/predict")
def predict(payload: PredictRequest):
    values = payload.features.dict()
    try:
        ordered = [values[name] for name in FEATURE_NAMES]
    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Missing feature: {e}")

    X = np.array(ordered, dtype=float).reshape(1, -1)
    X_scaled = SCALER.transform(X)
    prediction = float(MODEL.predict(X_scaled)[0])
    prediction = max(0.0, min(1.0, prediction))

    return {
        "flood_probability": round(prediction, 4),
        "flood_probability_pct": round(prediction * 100, 2),
        "risk": risk_level(prediction),
        "model_used": META["best_model"],
    }


# Serve the built frontend (present only in the Docker image), so one
# service answers both the API and the UI. Falls back gracefully in local
# dev where `static/` doesn't exist (Vite dev server serves the UI instead).
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
