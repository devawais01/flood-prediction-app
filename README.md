---
title: Flood Probability Predictor
emoji: 🌊
colorFrom: blue
colorTo: cyan
sdk: docker
app_port: 7860
pinned: false
---

# 🌊 Flood Probability Predictor

A full frontend + API wrapped around the model from
[flood-prediction-using-machine-learning](https://github.com/devawais01/flood-prediction-using-machine-learning).
Users enter 20 risk-factor scores through sliders and get back a predicted
flood probability, a risk category, and the model used.

> The block at the top of this file (`title`, `sdk: docker`, `app_port`, …) is
> **Hugging Face Spaces metadata** — Spaces reads it to know how to build and
> run this app. Don't remove it when you push to a Space.

---

## 1. System design

```
┌──────────────────────────┐        POST /api/predict         ┌───────────────────────────┐
│   React frontend (Vite)  │  ─────────────────────────────▶  │   FastAPI backend         │
│                           │                                   │                           │
│  - 20 grouped sliders     │  ◀─────────────────────────────  │  - Pydantic validation    │
│  - live risk gauge        │        JSON: probability,         │  - StandardScaler.transform│
│  - GET /api/meta on load  │        risk label, model used     │  - model.predict()        │
└──────────────────────────┘                                   │  - risk bucketing          │
                                                                  └─────────────┬─────────────┘
                                                                                │ loads at startup
                                                                                ▼
                                                                  model/model.pkl   (Polynomial
                                                                  model/scaler.pkl   Regression,
                                                                  model/meta.json     degree 1 —
                                                                                      R² = 1.00 on
                                                                                      the notebook's
                                                                                      dataset)
```

**Why this shape:**
- One container, one service. The React app is built at Docker build time
  and its static files are served *by the same FastAPI process* that serves
  the API (`main.py` mounts `static/` at `/`). This is exactly what Hugging
  Face Spaces' Docker SDK expects: a single process listening on one port.
- The model is trained **offline** (`backend/train_model.py`) and shipped as
  a pickle, not retrained on every request. The API only loads and calls it.
- `GET /api/meta` exists so the frontend never hard-codes feature ranges —
  if you retrain with different data, the sliders' min/max update
  automatically.

### Why Polynomial Regression (degree 1) was chosen

`train_model.py` reproduces the original notebook's comparison — Polynomial
Regression at degrees 1–3 vs. KNN Regression (k=5), 80/20 split,
`random_state=42` — and pick automatically by test R². On this dataset,
`FloodProbability` turns out to be an almost perfectly linear function of the
20 factor scores, so plain linear regression (degree 1) wins outright
(R² ≈ 1.00) over both higher-degree polynomials and KNN (R² ≈ 0.77). That's a
property of this specific (synthetic) dataset, not a shortcut — the script
still fits and compares all four candidates and prints the full metrics table
so you can see it for yourself.

---

## 2. Project structure

```
flood-app/
├── Dockerfile              # builds frontend, then runs the API that serves it
├── .dockerignore
├── README.md               # this file (also the Hugging Face Space card)
├── backend/
│   ├── main.py              # FastAPI app: /api/meta, /api/predict, /api/health
│   ├── train_model.py       # offline training script -> model/*.pkl
│   ├── requirements.txt
│   ├── dataset/flood.csv    # the original dataset (only needed to retrain)
│   └── model/
│       ├── model.pkl        # fitted regression model
│       ├── scaler.pkl       # fitted StandardScaler
│       └── meta.json        # feature names/ranges + metrics, read by the API
└── frontend/
    ├── src/
    │   ├── App.tsx           # form + result UI
    │   ├── App.css
    │   ├── api.ts            # typed fetch wrappers for the backend
    │   └── featureConfig.ts  # labels/descriptions/grouping for the 20 inputs
    └── ... (standard Vite + React + TypeScript scaffold)
```

---

## 3. Running it locally

### Option A — Docker (closest to production)

```bash
cd flood-app
docker build -t flood-app .
docker run -p 7860:7860 flood-app
```

Open http://localhost:7860 — the full app (UI + API) is there.

### Option B — Run backend and frontend separately (for active development)

```bash
# Terminal 1 — API
cd flood-app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — UI (hot reload)
cd flood-app/frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api/*` to `http://127.0.0.1:8000`
(see `frontend/vite.config.ts`), so the two processes talk to each other
automatically.

### Retraining the model

If you change the dataset or want to try other algorithms:

```bash
cd flood-app/backend
python3 train_model.py
```

This overwrites `model/model.pkl`, `model/scaler.pkl`, and `model/meta.json`
and prints an R²/MAE/RMSE comparison table for every candidate model.

---

## 4. Deploying for free — Hugging Face Spaces

Hugging Face Spaces will build the `Dockerfile` for you and host the running
container for free (Spaces occasionally sleep after inactivity on the free
CPU tier and wake up on the next visit — that's normal).

1. **Create a Hugging Face account** at https://huggingface.co (free).
2. **Create a new Space**: https://huggingface.co/new-space
   - Space name: e.g. `flood-probability-predictor`
   - License: MIT (matches the original repo)
   - **Space SDK: choose "Docker"**, template "Blank"
   - Visibility: Public (so anyone can use it) or Private
3. Hugging Face gives you a git remote for the new Space, e.g.
   `https://huggingface.co/spaces/<your-username>/flood-probability-predictor`.
   Push this `flood-app/` folder's contents to it:
   ```bash
   cd flood-app
   git init
   git add .
   git commit -m "Flood probability predictor: FastAPI + React"
   git remote add space https://huggingface.co/spaces/<your-username>/flood-probability-predictor
   git push --force space main
   ```
   (You'll be prompted for your Hugging Face username and an **access token**
   as the password — create one at https://huggingface.co/settings/tokens
   with "write" access.)
4. Open the Space page — it will show "Building" while it runs the
   Dockerfile, then switch to "Running" once the container starts. That URL
   is your live app: `https://<your-username>-flood-probability-predictor.hf.space`
5. Any future `git push` to that remote redeploys automatically.

**Why Docker SDK specifically:** Spaces' other SDKs (Gradio/Streamlit) expect
a single Python script in a specific framework; since this app is a real
FastAPI service plus a separately-built React bundle, "Docker" is the SDK
that lets Spaces just run exactly the container defined here.

---

## 5. API reference

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/health` | GET | — | `{"status": "ok"}` |
| `/api/meta` | GET | — | feature names, min/max ranges, model metrics |
| `/api/predict` | POST | `{"features": {"MonsoonIntensity": 3, ...all 20 keys...}}` | `{"flood_probability": 0.45, "flood_probability_pct": 45.0, "risk": {"label": "Moderate", "color": "#eab308"}, "model_used": "PolynomialRegression_deg1"}` |

All 20 feature keys are required per request and validated to be between 0
and 25 (a safety margin above the dataset's observed max of 22). The exact
list is in `backend/model/meta.json` → `feature_names`.

---

## 6. Notes / limitations to mention if you present this

- The model is a regression fit on a fixed historical dataset of factor
  *scores* (0–~20 scale per factor), not live weather/hydrological data —
  it estimates probability for a *hypothetical scenario* you describe with
  the sliders, it does not forecast an actual upcoming flood.
- Because the relationship in this dataset is close to linear, the deployed
  model is intentionally simple (linear regression under the hood, despite
  being run through a "Polynomial Regression, degree 1" pipeline for
  consistency with the comparison code) — that's the honest result of the
  model-selection step, not a shortcut taken to simplify the app.
