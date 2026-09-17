# --- Stage 1: build the React frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: FastAPI backend that also serves the built frontend ---
FROM python:3.11-slim
WORKDIR /app

# System deps kept minimal; scikit-learn/numpy/pandas wheels are pure enough
# not to need a compiler toolchain on this base image.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static

# Hugging Face Spaces (Docker SDK) expects the app to listen on port 7860.
EXPOSE 7860
ENV PORT=7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}