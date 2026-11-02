import math
from fastapi import APIRouter, Query
from typing import Optional
from app.database import dashboard_summary, latest_sensor, sensor_history, sensor_records_filtered, list_engines

router = APIRouter()

@router.get("/summary")
async def summary():
    return await dashboard_summary()

@router.get("/engine/{engine_id}")
async def engine_analytics(engine_id: str, limit: int = 100):
    latest = await latest_sensor(engine_id)
    history = await sensor_history(engine_id, max(1, min(limit, 1000)))
    if not latest:
        return {"engine_id": engine_id, "latest": None, "history_count": 0, "history": []}
    
    count = max(1, len(history))
    avg_vib = round(sum(x.get("vibration_mm_s", 0) for x in history) / count, 3)
    avg_temp = round(sum(x.get("engine_temperature_c", 0) for x in history) / count, 3)
    avg_oil = round(sum(x.get("oil_pressure_bar", 0) for x in history) / count, 3)
    avg_rpm = round(sum(x.get("rpm", 0) for x in history) / count, 1)
    avg_ex = round(sum(x.get("exhaust_temperature_c", 0) for x in history) / count, 2)
    avg_load = round(sum(x.get("engine_load_percent", 0) for x in history) / count, 2)

    return {
        "engine_id": engine_id,
        "latest": latest,
        "history_count": len(history),
        "history": history,
        "metrics": {
            "average_vibration_mm_s": avg_vib,
            "average_engine_temperature_c": avg_temp,
            "average_oil_pressure_bar": avg_oil,
            "average_rpm": avg_rpm,
            "average_exhaust_temperature_c": avg_ex,
            "average_engine_load_percent": avg_load
        }
    }

@router.get("/fleet-stats")
async def get_fleet_statistics(
    engine_id: Optional[str] = Query("all"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    records = await sensor_records_filtered(engine_id=engine_id, start_time=start_date, end_time=end_date, limit=1000)
    
    if not records:
        return {
            "total_records": 0,
            "parameters": {},
            "condition_distribution": {"Normal": 0, "Warning": 0, "High Risk": 0},
            "correlation": {}
        }

    fields = [
        ("rpm", "RPM"),
        ("engine_temperature_c", "Engine Temperature (°C)"),
        ("oil_pressure_bar", "Oil Pressure (bar)"),
        ("vibration_mm_s", "Vibration (mm/s)"),
        ("exhaust_temperature_c", "Exhaust Temp (°C)"),
        ("fuel_consumption_l_hr", "Fuel Consumption (L/hr)"),
        ("engine_load_percent", "Engine Load (%)"),
    ]

    stats = {}
    for key, label in fields:
        vals = [float(r.get(key, 0)) for r in records if r.get(key) is not None]
        if vals:
            mean = sum(vals) / len(vals)
            variance = sum((x - mean) ** 2 for x in vals) / len(vals)
            std_dev = math.sqrt(variance)
            stats[key] = {
                "label": label,
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "avg": round(mean, 2),
                "std": round(std_dev, 2)
            }
        else:
            stats[key] = {"label": label, "min": 0, "max": 0, "avg": 0, "std": 0}

    cond_counts = {"Normal": 0, "Warning": 0, "High Risk": 0}
    for r in records:
        c = r.get("engine_condition")
        if c in cond_counts:
            cond_counts[c] += 1

    return {
        "total_records": len(records),
        "engine_filter": engine_id,
        "parameters": stats,
        "condition_distribution": cond_counts,
        "recent_series": [
            {
                "timestamp": r.get("timestamp"),
                "engine_id": r.get("engine_id"),
                "vibration": r.get("vibration_mm_s"),
                "temperature": r.get("engine_temperature_c"),
                "oil_pressure": r.get("oil_pressure_bar"),
                "failure_probability": r.get("failure_probability")
            }
            for r in records[:50]
        ]
    }
