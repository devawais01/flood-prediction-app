"""
Train the flood probability regression model.

Reproduces the approach from the original notebook
(devawais01/flood-prediction-using-machine-learning):
  - StandardScaler on the 20 input features
  - Polynomial Regression (degrees 1-4) compared against KNN Regression
  - 80/20 train/test split, random_state=42
  - Best model selected by test R^2

Exports:
  model/scaler.pkl   - fitted StandardScaler
  model/model.pkl    - best-performing fitted model
  model/meta.json    - feature order, model choice, metrics (for the API + frontend)
"""

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

HERE = Path(__file__).parent
DATA_PATH = HERE / "dataset" / "flood.csv"
MODEL_DIR = HERE / "model"
MODEL_DIR.mkdir(exist_ok=True)

TARGET = "FloodProbability"


def main():
    df = pd.read_csv(DATA_PATH)
    feature_names = [c for c in df.columns if c != TARGET]

    X = df[feature_names].values
    y = df[TARGET].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    candidates = {}

    # Polynomial Regression, degrees 1-3.
    # (Degree 4 on 20 features blows up to >10,000 polynomial terms and is
    # both memory-prohibitive and a near-guaranteed overfit on this dataset,
    # so it's dropped here in favor of the degrees that can actually win.)
    for degree in [1, 2, 3]:
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_train_p = poly.fit_transform(X_train_s)
        X_test_p = poly.transform(X_test_s)

        lin = LinearRegression()
        lin.fit(X_train_p, y_train)
        preds = lin.predict(X_test_p)

        candidates[f"PolynomialRegression_deg{degree}"] = {
            "model": Pipeline([("poly", poly), ("lin", lin)]),
            "r2": r2_score(y_test, preds),
            "mae": mean_absolute_error(y_test, preds),
            "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
        }

    # KNN Regression (n_neighbors=5, as in the notebook)
    knn = KNeighborsRegressor(n_neighbors=5)
    knn.fit(X_train_s, y_train)
    preds = knn.predict(X_test_s)
    candidates["KNNRegression_k5"] = {
        "model": knn,
        "r2": r2_score(y_test, preds),
        "mae": mean_absolute_error(y_test, preds),
        "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
    }

    print("Model comparison (test set):")
    for name, info in candidates.items():
        print(f"  {name:28s}  R2={info['r2']:.4f}  MAE={info['mae']:.4f}  RMSE={info['rmse']:.4f}")

    best_name = max(candidates, key=lambda k: candidates[k]["r2"])
    best = candidates[best_name]
    print(f"\nBest model: {best_name} (R2={best['r2']:.4f})")

    # Refit the best model on ALL scaled data (train+test) for the deployed version,
    # so the shipped model uses every available row.
    X_all_s = scaler.fit_transform(X)
    if best_name.startswith("PolynomialRegression"):
        degree = int(best_name.split("_deg")[1])
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_all_p = poly.fit_transform(X_all_s)
        lin = LinearRegression()
        lin.fit(X_all_p, y)
        final_model = Pipeline([("poly", poly), ("lin", lin)])
    else:
        final_model = KNeighborsRegressor(n_neighbors=5)
        final_model.fit(X_all_s, y)

    with open(MODEL_DIR / "model.pkl", "wb") as f:
        pickle.dump(final_model, f)
    with open(MODEL_DIR / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    meta = {
        "feature_names": feature_names,
        "target": TARGET,
        "best_model": best_name,
        "metrics": {
            name: {"r2": info["r2"], "mae": info["mae"], "rmse": info["rmse"]}
            for name, info in candidates.items()
        },
        "feature_ranges": {
            col: {"min": float(df[col].min()), "max": float(df[col].max())}
            for col in feature_names
        },
        "target_range": {"min": float(y.min()), "max": float(y.max())},
    }
    with open(MODEL_DIR / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nSaved model.pkl, scaler.pkl, meta.json to {MODEL_DIR}")


if __name__ == "__main__":
    main()
