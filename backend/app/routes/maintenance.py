from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.database import list_engines, latest_sensor, sensor_history
from app.services.prediction_service import predict

router = APIRouter()

COMPONENT_HEALTH_RULES = [
    {
        "component": "Main Crankshaft & Journal Bearings",
        "primary_sensor": "vibration_mm_s",
        "threshold_warn": 3.2,
        "threshold_crit": 4.8,
        "recommendation": "Inspect journal bearing clearances and check lube oil film hydrodynamic stability."
    },
    {
        "component": "Cooling System & Heat Exchanger",
        "primary_sensor": "engine_temperature_c",
        "threshold_warn": 95.0,
        "threshold_crit": 110.0,
        "recommendation": "Check freshwater plate cooler differential pressure and examine seawater strainer."
    },
    {
        "component": "Lubrication Oil Circuit & Pump",
        "primary_sensor": "oil_pressure_bar",
        "inverted": True,
        "threshold_warn": 3.0,
        "threshold_crit": 2.2,
        "recommendation": "Perform oil filter cartridge replacement and oil viscosity laboratory test."
    },
    {
        "component": "Exhaust Valves & Turbocharger",
        "primary_sensor": "exhaust_temperature_c",
        "threshold_warn": 430.0,
        "threshold_crit": 500.0,
        "recommendation": "Inspect exhaust manifold pyrometer sensors and clean turbocharger nozzle ring."
    },
    {
        "component": "Fuel Injection & Combustion System",
        "primary_sensor": "fuel_consumption_l_hr",
        "threshold_warn": 270.0,
        "threshold_crit": 330.0,
        "recommendation": "Perform cylinder compression test and check fuel injector spray atomization."
    }
]

@router.get("/overview")
async def get_maintenance_overview():
    engines = await list_engines()
    
    # Sort engines by failure risk descending
    ranked_engines = sorted(
        engines,
        key=lambda x: x.get("failure_probability", 0),
        reverse=True
    )
    
    priority_counts = {"Urgent": 0, "High": 0, "Medium": 0, "Routine": 0}
    for e in ranked_engines:
        prob = e.get("failure_probability", 0)
        if prob >= 0.70:
            priority_counts["Urgent"] += 1
            e["maintenance_priority"] = "Urgent"
        elif prob >= 0.40:
            priority_counts["High"] += 1
            e["maintenance_priority"] = "High"
        elif prob >= 0.20:
            priority_counts["Medium"] += 1
            e["maintenance_priority"] = "Medium"
        else:
            priority_counts["Routine"] += 1
            e["maintenance_priority"] = "Routine"

    return {
        "ranked_engines": ranked_engines,
        "priority_summary": priority_counts,
        "total_monitored": len(engines)
    }

@router.get("/recommendations/{engine_id}")
async def get_engine_recommendations(engine_id: str):
    latest = await latest_sensor(engine_id)
    if not latest:
        raise HTTPException(status_code=404, detail="Engine telemetry not found")
        
    pred = predict(latest)
    
    # Component-level degradation analysis
    components = []
    for rule in COMPONENT_HEALTH_RULES:
        val = float(latest.get(rule["primary_sensor"], 0))
        is_inverted = rule.get("inverted", False)
        
        if is_inverted:
            if val <= rule["threshold_crit"]:
                status = "Critical"
                score = max(10, int(val / rule["threshold_warn"] * 70))
            elif val <= rule["threshold_warn"]:
                status = "Warning"
                score = 75
            else:
                status = "Optimal"
                score = 95
        else:
            if val >= rule["threshold_crit"]:
                status = "Critical"
                score = max(15, 100 - int((val / rule["threshold_crit"]) * 40))
            elif val >= rule["threshold_warn"]:
                status = "Warning"
                score = 70
            else:
                status = "Optimal"
                score = 96

        components.append({
            "component": rule["component"],
            "sensor": rule["primary_sensor"],
            "current_value": val,
            "status": status,
            "health_score": score,
            "recommendation": rule["recommendation"]
        })

    # Recommended maintenance actions with reasons
    action_items = []
    prob = pred["failure_probability"]
    
    if prob >= 0.70:
        action_items.append({
            "priority": "Urgent",
            "action": "Immediate Pre-Trip Engine Overhaul & Safety Inspection",
            "rationale": f"Overall failure risk is elevated to {pred['failure_probability_percent']}%. Multiple thermodynamic and vibrational indicators exceed acceptable marine tolerance limits.",
            "estimated_interval": "Within 24 operating hours"
        })
    elif prob >= 0.35:
        action_items.append({
            "priority": "High",
            "action": "Scheduled Preventative Maintenance & Sensor Re-Calibration",
            "rationale": f"Moderate engine degradation observed ({pred['failure_probability_percent']}% failure probability). Increasing frequency of operational warnings.",
            "estimated_interval": "Within 72 operating hours"
        })
    else:
        action_items.append({
            "priority": "Routine",
            "action": "Continuous Telemetry Watch & Next Scheduled Service",
            "rationale": "Engine parameters operate within nominal hydrodynamic ranges with satisfactory health scores.",
            "estimated_interval": "Next 500-hour planned maintenance window"
        })

    return {
        "engine_id": engine_id,
        "prediction": pred,
        "components": components,
        "action_items": action_items,
        "last_reading": latest
    }
