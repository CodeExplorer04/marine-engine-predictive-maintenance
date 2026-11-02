import pandas as pd


DATA_PATH = "ml/data/marine_engine_sensor_synthetic_dataset.csv"


df = pd.read_csv(DATA_PATH)


print("=" * 70)
print("TARGET ANALYSIS")
print("=" * 70)


# ---------------------------------------------------------
# Target distribution
# ---------------------------------------------------------

print("\nEngine Condition Distribution:")
print(
    df["Engine_Condition"].value_counts()
)


# ---------------------------------------------------------
# Failure probability by condition
# ---------------------------------------------------------

print("\nFailure Probability by Engine Condition:")

print(
    df.groupby("Engine_Condition")["Failure_Probability"]
    .agg([
        "count",
        "min",
        "max",
        "mean",
        "median",
        "std"
    ])
)


# ---------------------------------------------------------
# Sensor statistics by condition
# ---------------------------------------------------------

features = [
    "Operating_Hours",
    "Engine_Load_Percent",
    "Engine_Temperature_C",
    "Oil_Pressure_bar",
    "RPM",
    "Exhaust_Temperature_C",
    "Vibration_mm_s",
    "Fuel_Consumption_L_hr"
]


print("\nSensor Statistics by Engine Condition:")

for feature in features:

    print("\n----------------------------------------")
    print(feature)
    print("----------------------------------------")

    print(
        df.groupby("Engine_Condition")[feature]
        .agg([
            "min",
            "max",
            "mean",
            "median",
            "std"
        ])
    )


# ---------------------------------------------------------
# Correlation with Failure Probability
# ---------------------------------------------------------

print("\nCorrelation with Failure Probability:")

correlation = (
    df.select_dtypes(include="number")
    .corr()["Failure_Probability"]
    .sort_values(ascending=False)
)

print(correlation)


# ---------------------------------------------------------
# Sample records for each class
# ---------------------------------------------------------

print("\nSample NORMAL records:")

print(
    df[df["Engine_Condition"] == "Normal"]
    .head(10)
)


print("\nSample WARNING records:")

print(
    df[df["Engine_Condition"] == "Warning"]
    .head(10)
)


print("\nSample HIGH RISK records:")

print(
    df[df["Engine_Condition"] == "High Risk"]
    .head(10)
)