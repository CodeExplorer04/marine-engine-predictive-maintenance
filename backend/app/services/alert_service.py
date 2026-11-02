from datetime import datetime, timezone
from app.database import insert_alert

async def create_alert_if_needed(prediction: dict):
    condition = prediction["engine_condition"]
    if condition == "Normal":
        return None
    severity = "critical" if condition == "High Risk" else "warning"
    alert = {
        "engine_id": prediction["engine_id"],
        "alert_type": "failure_risk",
        "severity": severity,
        "message": (
            f"Engine failure probability is {prediction['failure_probability_percent']}%. "
            f"{prediction['maintenance_recommendation']}"
        ),
        "failure_probability": prediction["failure_probability"],
        "engine_condition": condition,
        "created_at": datetime.now(timezone.utc),
        "acknowledged": False,
    }
    return await insert_alert(alert)
