from datetime import datetime, timezone
from app.database import insert_remediation_action, list_remediation_actions, update_remediation_status

RECOMMENDATION_MATRIX = [
    {
        "trigger": "vibration_critical",
        "action": "Inspect main propulsion crankshaft damper and check alignment of shaft bearings.",
        "priority": "Urgent",
        "category": "Mechanical / Bearings",
        "safety_advisory": "Follow Lockout-Tagout (LOTO) protocols before uncoupling the engine shaft.",
        "estimated_hours": 4.5
    },
    {
        "trigger": "vibration_warning",
        "action": "Conduct laser shaft alignment check and test vibration harmonic dampers.",
        "priority": "High",
        "category": "Mechanical / Alignment",
        "safety_advisory": "Ensure vessel is at stable anchorage before high-precision laser alignment.",
        "estimated_hours": 2.5
    },
    {
        "trigger": "temperature_critical",
        "action": "Examine raw seawater sea chest suction filter and test fresh-water thermostatic mixing valve.",
        "priority": "Urgent",
        "category": "Cooling System",
        "safety_advisory": "Allow engine cooling circuit to depressurize before opening expansion tank.",
        "estimated_hours": 3.0
    },
    {
        "trigger": "oil_pressure_critical",
        "action": "Replace duplex lube oil filter cartridge, inspect pre-lubrication pump, and draw oil sample for spectrographic analysis.",
        "priority": "Urgent",
        "category": "Lubrication",
        "safety_advisory": "Wear thermal protective gloves when sampling high-temperature oil.",
        "estimated_hours": 2.0
    },
    {
        "trigger": "exhaust_temperature_critical",
        "action": "Calibrate cylinder fuel injector nozzles and clean turbocharger turbine wheel casing.",
        "priority": "High",
        "category": "Combustion / Exhaust",
        "safety_advisory": "Wait for exhaust manifold temperature to drop below 50°C before opening casing.",
        "estimated_hours": 5.0
    },
]

async def trigger_remediation_for_alert(engine_id: str, condition: str, abnormal_parameters: list) -> list:
    created_actions = []
    now = datetime.now(timezone.utc)
    
    # Check if there are already active pending tasks for this engine to avoid duplicates
    existing = await list_remediation_actions(engine_id=engine_id, status="Pending", limit=20)
    existing_actions_set = {x.get("action") for x in existing}

    for param in abnormal_parameters:
        field = param.get("field")
        sev = param.get("severity")
        trigger_key = f"{field}_{sev}"
        
        # Match template
        matched = None
        for t in RECOMMENDATION_MATRIX:
            if field in t["trigger"] and sev in t["trigger"]:
                matched = t
                break
            elif field in t["trigger"]:
                matched = t
                
        if matched and matched["action"] not in existing_actions_set:
            action_doc = {
                "engine_id": engine_id,
                "action": matched["action"],
                "trigger_parameter": param.get("parameter"),
                "observed_value": f"{param.get('value')} {param.get('unit')}",
                "threshold_limit": f"{param.get('threshold')} {param.get('unit')}",
                "priority": matched["priority"],
                "category": matched["category"],
                "safety_advisory": matched["safety_advisory"],
                "estimated_duration_hours": matched["estimated_hours"],
                "status": "Pending",
                "assigned_to": "Duty Marine Engineer",
                "created_at": now.isoformat(),
                "completed_at": None,
                "notes": None
            }
            saved = await insert_remediation_action(action_doc)
            created_actions.append(saved)
            existing_actions_set.add(matched["action"])

    # If general High Risk condition without specific parameter match
    if condition == "High Risk" and not created_actions and not existing:
        general_action = {
            "engine_id": engine_id,
            "action": "Initiate comprehensive engineering diagnostic survey and reduce engine load by 25%.",
            "trigger_parameter": "Multi-Sensor Risk Matrix",
            "observed_value": "Condition: High Risk",
            "threshold_limit": "Failure Probability >= 70%",
            "priority": "Urgent",
            "category": "Operational Safety",
            "safety_advisory": "Adhere to IMO STCW watchkeeping safety standing orders.",
            "estimated_duration_hours": 3.0,
            "status": "Pending",
            "assigned_to": "Chief Engineer",
            "created_at": now.isoformat(),
            "completed_at": None,
            "notes": None
        }
        saved = await insert_remediation_action(general_action)
        created_actions.append(saved)

    return created_actions
