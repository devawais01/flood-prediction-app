import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { fetchMeta, predict, type MetaResponse, type PredictResponse } from './api';
import { FEATURE_GROUPS } from './featureConfig';

const DEFAULT_MAX = 17; // fallback slider max before /api/meta loads

function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeta()
      .then((m) => {
        setMeta(m);
        const initial: Record<string, number> = {};
        for (const name of m.feature_names) {
          const mid = Math.round(((m.feature_ranges[name]?.max ?? DEFAULT_MAX) - (m.feature_ranges[name]?.min ?? 0)) / 2);
          initial[name] = mid;
        }
        setValues(initial);
      })
      .catch((e) => setMetaError(e.message));
  }, []);

  const overallScore = useMemo(() => {
    const nums = Object.values(values);
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [values]);

  function updateValue(key: string, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predict(values);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    if (!meta) return;
    const initial: Record<string, number> = {};
    for (const name of meta.feature_names) {
      const mid = Math.round(((meta.feature_ranges[name]?.max ?? DEFAULT_MAX) - (meta.feature_ranges[name]?.min ?? 0)) / 2);
      initial[name] = mid;
    }
    setValues(initial);
    setResult(null);
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-icon">🌊</div>
        <h1>Flood Probability Predictor</h1>
        <p>
          Rate 20 environmental, infrastructure and governance factors from 0 (very low) to their
          maximum (very high), and get an estimated flood probability for that scenario.
        </p>
        {metaError && <p className="error-banner">Could not load model info: {metaError}</p>}
      </header>

      <main className="layout">
        <form className="form-card" onSubmit={handleSubmit}>
          {FEATURE_GROUPS.map((group) => (
            <section className="group" key={group.title}>
              <h2>
                <span className="group-icon">{group.icon}</span> {group.title}
              </h2>
              <div className="group-grid">
                {group.features.map((f) => {
                  const range = meta?.feature_ranges[f.key];
                  const min = range?.min ?? 0;
                  const max = range?.max ?? DEFAULT_MAX;
                  const value = values[f.key] ?? Math.round((max - min) / 2);
                  return (
                    <div className="field" key={f.key}>
                      <div className="field-label-row">
                        <label htmlFor={f.key}>{f.label}</label>
                        <span className="field-value">{value}</span>
                      </div>
                      <input
                        id={f.key}
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={value}
                        onChange={(e) => updateValue(f.key, Number(e.target.value))}
                      />
                      <p className="field-help">{f.help}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="actions">
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Reset to midpoints
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !meta}>
              {loading ? 'Predicting…' : 'Predict flood probability'}
            </button>
          </div>
          {error && <p className="error-banner">{error}</p>}
        </form>

        <aside className="result-card">
          <h2>Result</h2>
          {!result && (
            <div className="result-placeholder">
              <p>Fill in the factors and click “Predict” to see the estimated flood probability.</p>
              <p className="muted">Current average input score: {overallScore.toFixed(1)}</p>
            </div>
          )}
          {result && (
            <div className="result-content">
              <div
                className="gauge"
                style={{
                  background: `conic-gradient(${result.risk.color} ${result.flood_probability_pct * 3.6}deg, #1f2937 0deg)`,
                }}
              >
                <div className="gauge-inner">
                  <span className="gauge-value">{result.flood_probability_pct}%</span>
                  <span className="gauge-label">probability</span>
                </div>
              </div>
              <div className="risk-badge" style={{ backgroundColor: result.risk.color }}>
                {result.risk.label} risk
              </div>
              <dl className="result-meta">
                <div>
                  <dt>Model used</dt>
                  <dd>{result.model_used}</dd>
                </div>
                <div>
                  <dt>Raw probability</dt>
                  <dd>{result.flood_probability}</dd>
                </div>
              </dl>
              <p className="disclaimer">
                This is a statistical estimate from a regression model trained on a fixed dataset of
                factor scores — not a real-time forecast. Always follow official flood warnings and
                local authority guidance.
              </p>
            </div>
          )}
        </aside>
      </main>

      <footer className="footer">
        <p>
          Built on the <strong>flood-prediction-using-machine-learning</strong> project · Model:
          Polynomial Regression (scikit-learn) · FastAPI + React
        </p>
      </footer>
    </div>
  );
}

export default App;
