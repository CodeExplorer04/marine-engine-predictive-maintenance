from functools import lru_cache
import joblib
import numpy as np
import pandas as pd
from app.config import MODEL_PATH
from app.services.risk_engine import classify_risk

FEATURES = [
    "Operating_Hours", "Engine_Load_Percent", "Engine_Temperature_C",
    "Oil_Pressure_bar", "RPM", "Exhaust_Temperature_C",
    "Vibration_mm_s", "Fuel_Consumption_L_hr",
]

@lru_cache(maxsize=1)
def load_model():
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    return None

def _to_features(payload: dict):
    return {
        "Operating_Hours": payload["operating_hours"],
        "Engine_Load_Percent": payload["engine_load_percent"],
        "Engine_Temperature_C": payload["engine_temperature_c"],
        "Oil_Pressure_bar": payload["oil_pressure_bar"],
        "RPM": payload["rpm"],
        "Exhaust_Temperature_C": payload["exhaust_temperature_c"],
        "Vibration_mm_s": payload["vibration_mm_s"],
        "Fuel_Consumption_L_hr": payload["fuel_consumption_l_hr"],
    }

def _fallback_probability(f: dict) -> float:
    """Conservative demo heuristic used only when the trained model file is absent.
    Replace by the trained model for valid ML predictions."""
    score = 0.0
    score += min(f["Vibration_mm_s"] / 12.0, 1.0) * 0.40
    score += min(max((f["Engine_Temperature_C"] - 75) / 60, 0), 1) * 0.20
    score += min(max((2.5 - f["Oil_Pressure_bar"]) / 2.5, 0), 1) * 0.20
    score += min(max((f["Exhaust_Temperature_C"] - 350) / 350, 0), 1) * 0.10
    score += min(f["Operating_Hours"] / 30000, 1) * 0.10
    return round(max(0.0, min(score, 1.0)), 4)

def predict(payload: dict) -> dict:
    features = _to_features(payload)
    model = load_model()
    source = "trained_random_forest"
    if model is None:
        probability = _fallback_probability(features)
        source = "fallback_heuristic_model_missing"
    else:
        frame = pd.DataFrame([features], columns=FEATURES)
        raw = float(np.asarray(model.predict(frame)).reshape(-1)[0])
        probability = max(0.0, min(1.0, raw))
    condition, health_score, recommendation = classify_risk(probability)
    return {
        "engine_id": payload["engine_id"],
        "failure_probability": round(probability, 4),
        "failure_probability_percent": round(probability * 100, 2),
        "engine_condition": condition,
        "engine_health_score": health_score,
        "maintenance_recommendation": recommendation,
        "prediction_source": source,
        "features_used": features,
    }
