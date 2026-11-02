import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.schemas.sensors import SensorReading
from app.database import insert_sensor, latest_sensor, sensor_history, list_engines
from app.services.prediction_service import predict
from app.services.alert_service import create_alert_if_needed
from app.services.anomaly_service import detect_anomalies
from app.services.remediation_service import trigger_remediation_for_alert

router = APIRouter()

class SimulationTrigger(BaseModel):
    engine_id: str = Field(default="ENGINE-001")
    scenario: str = Field(default="mixed", description="normal, warning, high_risk, or mixed")

@router.post("/", status_code=201)
async def create_sensor_reading(reading: SensorReading):
    data = reading.model_dump()
    prediction = predict(data)
    
    # Evaluate multivariate and threshold anomalies
    anomaly_result = await detect_anomalies(data, save_if_anomaly=True)
    
    saved = await insert_sensor({**data, **{
        "failure_probability": prediction["failure_probability"],
        "engine_condition": prediction["engine_condition"],
        "engine_health_score": prediction["engine_health_score"],
        "is_anomaly": anomaly_result["is_anomaly"],
        "anomaly_severity": anomaly_result["severity"]
    }})
    
    alert = await create_alert_if_needed(prediction)
    
    # If high risk or abnormal, trigger automated remediation proposal
    remediation_actions = []
    if alert or anomaly_result["is_anomaly"]:
        remediation_actions = await trigger_remediation_for_alert(
            engine_id=data["engine_id"],
            condition=prediction["engine_condition"],
            abnormal_parameters=anomaly_result["abnormal_parameters"]
        )

    return {
        "message": "Sensor reading saved",
        "reading": saved,
        "prediction": prediction,
        "anomaly": anomaly_result,
        "alert": alert,
        "remediation_actions_triggered": len(remediation_actions)
    }

@router.get("/latest/{engine_id}")
async def get_latest_reading(engine_id: str):
    item = await latest_sensor(engine_id)
    if not item:
        raise HTTPException(status_code=404, detail="No readings found for this engine")
    return item

@router.get("/history/{engine_id}")
async def get_sensor_history(engine_id: str, limit: int = Query(100, ge=1, le=1000)):
    readings = await sensor_history(engine_id, limit)
    return {"engine_id": engine_id, "count": len(readings), "readings": readings}

@router.get("/engines")
async def get_engines_list():
    """List all monitored engines with health status and latest parameters."""
    return await list_engines()

@router.post("/simulate")
async def trigger_simulation_reading(payload: SimulationTrigger):
    """Generate and inject a realistic test reading for demonstration."""
    eng = payload.engine_id
    scenario = payload.scenario
    
    if scenario == "normal":
        rpm = random.uniform(1200, 1550)
        temp = random.uniform(76, 90)
        oil = random.uniform(4.2, 5.4)
        vib = random.uniform(1.1, 2.6)
        load = random.uniform(42, 68)
        ex = random.uniform(310, 385)
        fuel = random.uniform(185, 235)
    elif scenario == "warning":
        rpm = random.uniform(1450, 1750)
        temp = random.uniform(93, 107)
        oil = random.uniform(2.9, 3.7)
        vib = random.uniform(3.0, 4.2)
        load = random.uniform(68, 84)
        ex = random.uniform(395, 455)
        fuel = random.uniform(235, 285)
    elif scenario == "high_risk":
        rpm = random.uniform(1550, 1900)
        temp = random.uniform(109, 125)
        oil = random.uniform(1.8, 2.8)
        vib = random.uniform(4.6, 6.7)
        load = random.uniform(84, 98)
        ex = random.uniform(465, 535)
        fuel = random.uniform(285, 355)
    else: # mixed
        choice = random.choice(["normal", "normal", "warning", "high_risk"])
        return await trigger_simulation_reading(SimulationTrigger(engine_id=eng, scenario=choice))

    coolant = temp - random.uniform(7, 13)
    ambient = random.uniform(25, 33)
    latest = await latest_sensor(eng)
    prev_hours = float(latest.get("operating_hours", 5000.0)) if latest else 5000.0

    reading_dict = {
        "engine_id": eng,
        "operating_hours": round(prev_hours + 0.1, 1),
        "engine_load_percent": round(load, 2),
        "engine_temperature_c": round(temp, 2),
        "oil_pressure_bar": round(oil, 2),
        "rpm": round(rpm, 2),
        "exhaust_temperature_c": round(ex, 2),
        "vibration_mm_s": round(vib, 2),
        "fuel_consumption_l_hr": round(fuel, 2),
        "coolant_temperature": round(coolant, 2),
        "ambient_temperature": round(ambient, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        # Common UI convenience aliases
        "engine_rpm": round(rpm, 2),
        "engine_temperature": round(temp, 2),
        "oil_pressure": round(oil, 2),
        "vibration": round(vib, 2),
        "engine_load": round(load, 2),
        "exhaust_temperature": round(ex, 2),
        "fuel_consumption": round(fuel, 2),
    }

    reading_obj = SensorReading(**reading_dict)
    return await create_sensor_reading(reading_obj)

