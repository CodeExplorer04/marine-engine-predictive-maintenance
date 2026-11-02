from datetime import datetime, timezone
from pathlib import Path
import joblib
import pandas as pd
from app.database import get_active_thresholds, insert_anomaly

ISOLATION_FOREST_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "models" / "isolation_forest.joblib"
_iso_model = None

def get_isolation_forest():
    global _iso_model
    if _iso_model is None and ISOLATION_FOREST_PATH.exists():
        try:
            _iso_model = joblib.load(ISOLATION_FOREST_PATH)
        except Exception:
            _iso_model = None
    return _iso_model

async def detect_anomalies(sensor_data: dict, save_if_anomaly: bool = True) -> dict:
    thresholds = await get_active_thresholds()
    abnormal_params = []

    # 1. Vibration
    vib = float(sensor_data.get("vibration_mm_s", 0))
    th_vib = thresholds.get("vibration_mm_s", {})
    if vib >= th_vib.get("critical", 4.8):
        abnormal_params.append({
            "parameter": "Vibration",
            "field": "vibration_mm_s",
            "value": vib,
            "threshold": th_vib.get("critical", 4.8),
            "unit": "mm/s",
            "severity": "critical",
            "implication": "Severe structural oscillation or main journal bearing wear"
        })
    elif vib >= th_vib.get("warning", 3.5):
        abnormal_params.append({
            "parameter": "Vibration",
            "field": "vibration_mm_s",
            "value": vib,
            "threshold": th_vib.get("warning", 3.5),
            "unit": "mm/s",
            "severity": "warning",
            "implication": "Elevated rotational vibration detected"
        })

    # 2. Engine Temperature
    temp = float(sensor_data.get("engine_temperature_c", 0))
    th_temp = thresholds.get("engine_temperature_c", {})
    if temp >= th_temp.get("critical", 110.0):
        abnormal_params.append({
            "parameter": "Engine Temperature",
            "field": "engine_temperature_c",
            "value": temp,
            "threshold": th_temp.get("critical", 110.0),
            "unit": "°C",
            "severity": "critical",
            "implication": "Coolant system thermal runaway or heat exchanger fouling"
        })
    elif temp >= th_temp.get("warning", 95.0):
        abnormal_params.append({
            "parameter": "Engine Temperature",
            "field": "engine_temperature_c",
            "value": temp,
            "threshold": th_temp.get("warning", 95.0),
            "unit": "°C",
            "severity": "warning",
            "implication": "Coolant thermal dissipation efficiency decreasing"
        })

    # 3. Oil Pressure
    oil = float(sensor_data.get("oil_pressure_bar", 0))
    th_oil = thresholds.get("oil_pressure_bar", {})
    if oil <= th_oil.get("critical_min", 2.2):
        abnormal_params.append({
            "parameter": "Oil Pressure",
            "field": "oil_pressure_bar",
            "value": oil,
            "threshold": th_oil.get("critical_min", 2.2),
            "unit": "bar",
            "severity": "critical",
            "implication": "Critical lubrication oil pressure loss – risk of crankshaft seizure"
        })
    elif oil <= th_oil.get("warning_min", 3.0):
        abnormal_params.append({
            "parameter": "Oil Pressure",
            "field": "oil_pressure_bar",
            "value": oil,
            "threshold": th_oil.get("warning_min", 3.0),
            "unit": "bar",
            "severity": "warning",
            "implication": "Low lube pressure – check filter differential and oil pump"
        })

    # 4. Exhaust Temperature
    exh = float(sensor_data.get("exhaust_temperature_c", 0))
    th_exh = thresholds.get("exhaust_temperature_c", {})
    if exh >= th_exh.get("critical", 500.0):
        abnormal_params.append({
            "parameter": "Exhaust Temperature",
            "field": "exhaust_temperature_c",
            "value": exh,
            "threshold": th_exh.get("critical", 500.0),
            "unit": "°C",
            "severity": "critical",
            "implication": "Cylinder combustion blow-by or late fuel injection timing"
        })

    # Isolation Forest inference
    iso_model = get_isolation_forest()
    ml_is_anomaly = False
    ml_score = 0.0

    if iso_model is not None:
        try:
            feat_dict = {
                "Operating_Hours": float(sensor_data.get("operating_hours", 5000)),
                "Engine_Load_Percent": float(sensor_data.get("engine_load_percent", 50)),
                "Engine_Temperature_C": float(sensor_data.get("engine_temperature_c", 85)),
                "Oil_Pressure_bar": float(sensor_data.get("oil_pressure_bar", 4.0)),
                "RPM": float(sensor_data.get("rpm", 1400)),
                "Exhaust_Temperature_C": float(sensor_data.get("exhaust_temperature_c", 350)),
                "Vibration_mm_s": float(sensor_data.get("vibration_mm_s", 2.0)),
                "Fuel_Consumption_L_hr": float(sensor_data.get("fuel_consumption_l_hr", 200)),
            }
            frame = pd.DataFrame([feat_dict], columns=[
                "Operating_Hours", "Engine_Load_Percent", "Engine_Temperature_C",
                "Oil_Pressure_bar", "RPM", "Exhaust_Temperature_C",
                "Vibration_mm_s", "Fuel_Consumption_L_hr"
            ])
            score = float(iso_model.decision_function(frame)[0])
            ml_score = round(score, 4)
            pred = int(iso_model.predict(frame)[0])
            ml_is_anomaly = bool(pred == -1)
        except Exception:
            pass

    is_anomaly = bool(len(abnormal_params) > 0 or ml_is_anomaly)

    severity = "normal"
    if any(p["severity"] == "critical" for p in abnormal_params):
        severity = "critical"
    elif len(abnormal_params) > 0 or ml_is_anomaly:
        severity = "warning"

    diagnosis = "Normal operating parameters within safe marine thresholds."
    if abnormal_params:
        diag_parts = [f"{p['parameter']} ({p['value']}{p['unit']}): {p['implication']}" for p in abnormal_params]
        diagnosis = "; ".join(diag_parts)
    elif ml_is_anomaly:
        diagnosis = "Multivariate statistical anomaly detected by Isolation Forest model (anomalous sensor pattern)."

    result = {
        "engine_id": sensor_data.get("engine_id", "ENGINE-001"),
        "timestamp": sensor_data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "is_anomaly": is_anomaly,
        "severity": severity,
        "isolation_forest_anomaly": ml_is_anomaly,
        "isolation_forest_score": ml_score,
        "abnormal_parameters": abnormal_params,
        "parameter_violation_count": len(abnormal_params),
        "diagnosis": diagnosis,
        "sensor_snapshot": {
            "rpm": sensor_data.get("rpm"),
            "temperature": sensor_data.get("engine_temperature_c"),
            "oil_pressure": sensor_data.get("oil_pressure_bar"),
            "vibration": sensor_data.get("vibration_mm_s"),
            "exhaust_temp": sensor_data.get("exhaust_temperature_c"),
            "engine_load": sensor_data.get("engine_load_percent"),
        }
    }

    if is_anomaly and save_if_anomaly:
        await insert_anomaly(result)

    return result
