export interface FeatureRange {
  min: number;
  max: number;
}

export interface MetaResponse {
  feature_names: string[];
  feature_ranges: Record<string, FeatureRange>;
  target_range: FeatureRange;
  best_model: string;
  metrics: Record<string, { r2: number; mae: number; rmse: number }>;
}

export interface PredictResponse {
  flood_probability: number;
  flood_probability_pct: number;
  risk: { label: string; color: string };
  model_used: string;
}

const BASE = '/api';

export async function fetchMeta(): Promise<MetaResponse> {
  const res = await fetch(`${BASE}/meta`);
  if (!res.ok) throw new Error('Failed to load model metadata');
  return res.json();
}

export async function predict(features: Record<string, number>): Promise<PredictResponse> {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ? JSON.stringify(body.detail) : 'Prediction failed');
  }
  return res.json();
}
