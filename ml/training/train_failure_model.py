import os
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "marine_engine_sensor_synthetic_dataset.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "failure_probability_model.joblib"
)

METRICS_PATH = os.path.join(
    MODEL_DIR,
    "failure_probability_metrics.json"
)


# =========================================================
# FEATURES
# =========================================================

FEATURES = [
    "Operating_Hours",
    "Engine_Load_Percent",
    "Engine_Temperature_C",
    "Oil_Pressure_bar",
    "RPM",
    "Exhaust_Temperature_C",
    "Vibration_mm_s",
    "Fuel_Consumption_L_hr"
]

TARGET = "Failure_Probability"


# =========================================================
# LOAD DATA
# =========================================================

print("=" * 70)
print("MARINE ENGINE FAILURE PROBABILITY MODEL")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

print(f"\nDataset shape: {df.shape}")


# =========================================================
# CLEANING
# =========================================================

print("\nCleaning data...")

df.loc[
    df["Operating_Hours"] < 0,
    "Operating_Hours"
] = np.nan

df.loc[
    (df["Engine_Load_Percent"] < 0) |
    (df["Engine_Load_Percent"] > 100),
    "Engine_Load_Percent"
] = np.nan

df.loc[
    df["Oil_Pressure_bar"] < 0,
    "Oil_Pressure_bar"
] = np.nan

df.loc[
    df["RPM"] < 0,
    "RPM"
] = np.nan


# Remove missing target values
df = df.dropna(
    subset=[TARGET]
)


# =========================================================
# FEATURES / TARGET
# =========================================================

X = df[FEATURES]

y = df[TARGET]


# =========================================================
# TRAIN TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


print(
    f"\nTraining samples: {len(X_train)}"
)

print(
    f"Testing samples: {len(X_test)}"
)


# =========================================================
# MODEL
# =========================================================

pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(
                strategy="median"
            )
        ),

        (
            "model",
            RandomForestRegressor(
                n_estimators=250,
                random_state=42,
                n_jobs=-1
            )
        )
    ]
)


# =========================================================
# TRAIN
# =========================================================

print("\nTraining Random Forest Regressor...")

pipeline.fit(
    X_train,
    y_train
)

print("Training completed.")


# =========================================================
# PREDICTION
# =========================================================

predictions = pipeline.predict(
    X_test
)


# =========================================================
# METRICS
# =========================================================

mae = mean_absolute_error(
    y_test,
    predictions
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

r2 = r2_score(
    y_test,
    predictions
)


# =========================================================
# RESULTS
# =========================================================

print("\n" + "=" * 70)
print("REGRESSION RESULTS")
print("=" * 70)

print(
    f"\nMAE  : {mae:.4f}"
)

print(
    f"RMSE : {rmse:.4f}"
)

print(
    f"R²   : {r2:.4f}"
)


# =========================================================
# FEATURE IMPORTANCE
# =========================================================

model = pipeline.named_steps["model"]

importance = pd.DataFrame(
    {
        "feature": FEATURES,
        "importance": model.feature_importances_
    }
).sort_values(
    "importance",
    ascending=False
)

print("\nFeature Importance:")

print(
    importance.to_string(
        index=False
    )
)


# =========================================================
# SAVE MODEL
# =========================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    pipeline,
    MODEL_PATH
)


# =========================================================
# SAVE METRICS
# =========================================================

metrics = {
    "model": "Random Forest Regressor",
    "target": TARGET,
    "dataset_rows": len(df),
    "features": FEATURES,
    "mae": float(mae),
    "rmse": float(rmse),
    "r2": float(r2)
}

with open(
    METRICS_PATH,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        metrics,
        file,
        indent=4
    )


print(
    f"\nModel saved to:\n{MODEL_PATH}"
)

print(
    f"Metrics saved to:\n{METRICS_PATH}"
)

print("\nMODEL TRAINING COMPLETE")