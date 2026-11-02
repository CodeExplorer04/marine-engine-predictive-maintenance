
import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier
)

from sklearn.tree import DecisionTreeClassifier

from sklearn.impute import SimpleImputer

from sklearn.pipeline import Pipeline

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)


# =====================================================
# CONFIGURATION
# =====================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "marine_engine_sensor_synthetic_dataset.csv"
)

MODEL_DIR = os.path.join(BASE_DIR, "models")

RESULT_DIR = os.path.join(BASE_DIR, "evaluation")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)


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

TARGET = "Engine_Condition"


# =====================================================
# LOAD DATASET
# =====================================================

print("\nLoading Marine Engine Dataset...")

df = pd.read_csv(DATA_PATH)

df = df.dropna(subset=[TARGET])

X = df[FEATURES].apply(
    pd.to_numeric,
    errors="coerce"
)

y = df[TARGET]


print("Dataset Shape:", df.shape)

print("\nTarget Distribution:")
print(y.value_counts())


# =====================================================
# TRAIN TEST SPLIT
# =====================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining Samples:", len(X_train))
print("Testing Samples:", len(X_test))


# =====================================================
# DEFINE THREE MODELS
# =====================================================

models = {

    "Random Forest": RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    ),

    "Decision Tree": DecisionTreeClassifier(
        random_state=42,
        class_weight="balanced"
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        random_state=42
    )

}


# =====================================================
# MODEL TRAINING AND TESTING
# =====================================================

results = []

trained_models = {}

for name, classifier in models.items():

    print("\n" + "=" * 60)
    print("TRAINING:", name)
    print("=" * 60)

    pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median")
            ),
            (
                "classifier",
                classifier
            )
        ]
    )

    # Train model
    pipeline.fit(X_train, y_train)

    # Predictions
    y_pred = pipeline.predict(X_test)

    y_probability = pipeline.predict_proba(X_test)

    # Evaluation metrics
    accuracy = accuracy_score(y_test, y_pred)

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

    try:
        roc_auc = roc_auc_score(
            y_test,
            y_probability,
            labels=pipeline.classes_,
            multi_class="ovr",
            average="weighted"
        )
    except ValueError:
        roc_auc = None

    # Store results
    results.append({
        "Model": name,
        "Accuracy": accuracy,
        "Precision": precision,
        "Recall": recall,
        "F1 Score": f1,
        "ROC-AUC": roc_auc
    })

    trained_models[name] = pipeline

    # Save model
    filename = name.lower().replace(" ", "_") + "_model.joblib"

    joblib.dump(
        pipeline,
        os.path.join(MODEL_DIR, filename)
    )

    print("\nAccuracy:", round(accuracy, 4))
    print("Precision:", round(precision, 4))
    print("Recall:", round(recall, 4))
    print("F1 Score:", round(f1, 4))
    print("ROC-AUC:", roc_auc)

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            y_pred,
            zero_division=0
        )
    )

    # Confusion matrix
    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=pipeline.classes_
    )

    print("Confusion Matrix:")
    print(cm)

    # Save confusion matrix image
    plt.figure(figsize=(7, 5))

    plt.imshow(cm, interpolation="nearest")
    plt.title(name + " - Confusion Matrix")
    plt.colorbar()

    plt.xticks(
        range(len(pipeline.classes_)),
        pipeline.classes_,
        rotation=30
    )

    plt.yticks(
        range(len(pipeline.classes_)),
        pipeline.classes_
    )

    plt.xlabel("Predicted Condition")
    plt.ylabel("Actual Condition")

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, str(cm[i, j]), ha="center", va="center")

    plt.tight_layout()

    plt.savefig(
        os.path.join(
            RESULT_DIR,
            name.lower().replace(" ", "_") + "_confusion_matrix.png"
        )
    )

    plt.close()


# =====================================================
# MODEL COMPARISON
# =====================================================

comparison = pd.DataFrame(results)

comparison = comparison.sort_values(
    by="F1 Score",
    ascending=False
)

print("\n" + "=" * 70)
print("FINAL MODEL COMPARISON")
print("=" * 70)

print(comparison.to_string(index=False))


# Save comparison CSV
comparison.to_csv(
    os.path.join(RESULT_DIR, "model_comparison.csv"),
    index=False
)


# Save comparison JSON
comparison.to_json(
    os.path.join(RESULT_DIR, "model_comparison.json"),
    orient="records",
    indent=4
)


# =====================================================
# PERFORMANCE GRAPH
# =====================================================

metrics = [
    "Accuracy",
    "Precision",
    "Recall",
    "F1 Score"
]

comparison.plot(
    x="Model",
    y=metrics,
    kind="bar",
    figsize=(11, 6)
)

plt.title("Marine Engine ML Model Performance Comparison")
plt.ylabel("Score")
plt.ylim(0, 1.05)
plt.xticks(rotation=0)
plt.tight_layout()

plt.savefig(
    os.path.join(RESULT_DIR, "model_comparison.png")
)

plt.close()


# =====================================================
# BEST MODEL
# =====================================================

best_model_name = comparison.iloc[0]["Model"]

best_model = trained_models[best_model_name]

best_filename = (
    best_model_name.lower().replace(" ", "_")
    + "_model.joblib"
)

joblib.dump(
    best_model,
    os.path.join(MODEL_DIR, "best_engine_condition_model.joblib")
)

print("\nBEST PERFORMING MODEL:", best_model_name)

print("\nBest model saved successfully.")

print("\nAll testing and comparison completed!")
