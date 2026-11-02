import os
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# =========================================================
# CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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
    "marine_engine_random_forest.joblib"
)

METRICS_PATH = os.path.join(
    MODEL_DIR,
    "model_metrics.json"
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
    "Fuel_Consumption_L_hr",
]

TARGET = "Engine_Condition"


# =========================================================
# LOAD DATA
# =========================================================

print("=" * 70)
print("MARINE ENGINE PREDICTIVE MAINTENANCE - MODEL TRAINING")
print("=" * 70)

print("\nLoading dataset...")

df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")

print("\nColumns:")
for column in df.columns:
    print(f"  - {column}")


# =========================================================
# BASIC VALIDATION
# =========================================================

required_columns = FEATURES + [TARGET]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:

    raise ValueError(
        f"Missing required columns: {missing_columns}"
    )


print("\nMissing values before preprocessing:")

print(
    df[required_columns]
    .isnull()
    .sum()
)


# =========================================================
# DATA CLEANING
# =========================================================

print("\nCleaning physically invalid values...")

# Negative operating hours are invalid
df.loc[
    df["Operating_Hours"] < 0,
    "Operating_Hours"
] = np.nan


# Engine load should normally be between 0 and 100%
df.loc[
    (df["Engine_Load_Percent"] < 0) |
    (df["Engine_Load_Percent"] > 100),
    "Engine_Load_Percent"
] = np.nan


# Oil pressure cannot be negative
df.loc[
    df["Oil_Pressure_bar"] < 0,
    "Oil_Pressure_bar"
] = np.nan


# RPM cannot be negative
df.loc[
    df["RPM"] < 0,
    "RPM"
] = np.nan


# Temperature values should be numeric
numeric_features = FEATURES

for column in numeric_features:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


# Remove rows with missing target
df = df.dropna(subset=[TARGET])


print(
    f"Dataset shape after validation: {df.shape}"
)


# =========================================================
# FEATURE / TARGET SEPARATION
# =========================================================

X = df[FEATURES]

y = df[TARGET]


print("\nTarget distribution:")

print(
    y.value_counts()
)


# =========================================================
# TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# =========================================================
# PREPROCESSING + RANDOM FOREST
# =========================================================

pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        ),

        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                max_depth=None,
                min_samples_split=2,
                random_state=42,
                n_jobs=-1,
                class_weight="balanced"
            )
        )
    ]
)


# =========================================================
# TRAIN MODEL
# =========================================================

print("\nTraining Random Forest...")

pipeline.fit(
    X_train,
    y_train
)

print("Training completed.")


# =========================================================
# PREDICTION
# =========================================================

y_pred = pipeline.predict(X_test)

y_probability = pipeline.predict_proba(X_test)


# =========================================================
# EVALUATION
# =========================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)


# ROC-AUC
try:

    roc_auc = roc_auc_score(
        y_test,
        y_probability,
        multi_class="ovr",
        average="weighted"
    )

except ValueError:

    roc_auc = None


# =========================================================
# CONFUSION MATRIX
# =========================================================

labels = sorted(
    y.unique()
)

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=labels
)


# =========================================================
# OUTPUT RESULTS
# =========================================================

print("\n" + "=" * 70)
print("MODEL EVALUATION")
print("=" * 70)

print(
    f"\nAccuracy  : {accuracy:.4f}"
)

print(
    f"Precision : {precision:.4f}"
)

print(
    f"Recall    : {recall:.4f}"
)

print(
    f"F1 Score  : {f1:.4f}"
)

if roc_auc is not None:

    print(
        f"ROC-AUC   : {roc_auc:.4f}"
    )


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        zero_division=0
    )
)


print("\nConfusion Matrix:")

print(cm)


# =========================================================
# FEATURE IMPORTANCE
# =========================================================

classifier = pipeline.named_steps["classifier"]

feature_importance = (
    pd.DataFrame({
        "feature": FEATURES,
        "importance": classifier.feature_importances_
    })
    .sort_values(
        "importance",
        ascending=False
    )
)

print("\nFeature Importance:")

print(
    feature_importance.to_string(
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

print(
    f"\nModel saved to:\n{MODEL_PATH}"
)


# =========================================================
# SAVE METRICS
# =========================================================

metrics = {
    "model": "Random Forest",
    "dataset_rows": int(len(df)),
    "features": FEATURES,
    "target": TARGET,
    "test_size": 0.20,
    "accuracy": float(accuracy),
    "precision_weighted": float(precision),
    "recall_weighted": float(recall),
    "f1_weighted": float(f1),
    "roc_auc_weighted_ovr": (
        float(roc_auc)
        if roc_auc is not None
        else None
    ),
    "classes": labels,
    "confusion_matrix": cm.tolist(),
    "feature_importance": {
        row["feature"]: float(row["importance"])
        for _, row in feature_importance.iterrows()
    }
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
    f"Metrics saved to:\n{METRICS_PATH}"
)


print("\n" + "=" * 70)
print("MODEL TRAINING COMPLETE")
print("=" * 70)