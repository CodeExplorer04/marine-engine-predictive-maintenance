import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.database import sensor_records_filtered, list_alerts, list_remediation_actions, list_engines, latest_sensor

router = APIRouter()

@router.get("/generate")
async def generate_report_preview(
    engine_id: str = Query("all"),
    start_date: str | None = None,
    end_date: str | None = None,
    report_type: str = Query("health_summary")
):
    readings = await sensor_records_filtered(engine_id=engine_id, start_time=start_date, end_time=end_date, limit=300)
    alerts = await list_alerts(engine_id=engine_id, limit=100)
    actions = await list_remediation_actions(engine_id=engine_id, limit=50)
    engines = await list_engines()

    if readings:
        avg_temp = round(sum(r.get("engine_temperature_c", 0) for r in readings) / len(readings), 2)
        avg_vib = round(sum(r.get("vibration_mm_s", 0) for r in readings) / len(readings), 2)
        avg_oil = round(sum(r.get("oil_pressure_bar", 0) for r in readings) / len(readings), 2)
        avg_load = round(sum(r.get("engine_load_percent", 0) for r in readings) / len(readings), 2)
        max_vib = round(max((r.get("vibration_mm_s", 0) for r in readings), default=0), 2)
        max_temp = round(max((r.get("engine_temperature_c", 0) for r in readings), default=0), 2)
    else:
        avg_temp = avg_vib = avg_oil = avg_load = max_vib = max_temp = 0.0

    return {
        "report_id": f"REP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_type": report_type,
        "engine_filter": engine_id,
        "date_range": {
            "start": start_date or "Earliest Available",
            "end": end_date or "Latest Available"
        },
        "summary_statistics": {
            "total_telemetry_records": len(readings),
            "total_alerts_recorded": len(alerts),
            "remediation_actions_count": len(actions),
            "average_temperature_c": avg_temp,
            "average_vibration_mm_s": avg_vib,
            "average_oil_pressure_bar": avg_oil,
            "average_engine_load_percent": avg_load,
            "peak_vibration_mm_s": max_vib,
            "peak_temperature_c": max_temp
        },
        "recent_readings": readings[:15],
        "alerts_sample": alerts[:10],
        "remediation_sample": actions[:10]
    }

@router.get("/export-csv")
async def export_report_csv(
    engine_id: str = Query("all"),
    start_date: str | None = None,
    end_date: str | None = None,
    data_type: str = Query("sensors", description="sensors, alerts, or remediation")
):
    output = io.StringIO()
    writer = csv.writer(output)

    if data_type == "alerts":
        alerts = await list_alerts(engine_id=engine_id, limit=1000)
        writer.writerow(["Alert_ID", "Engine_ID", "Severity", "Alert_Type", "Message", "Created_At", "Status", "Acknowledged"])
        for a in alerts:
            writer.writerow([
                a.get("alert_id", ""),
                a.get("engine_id", ""),
                a.get("severity", ""),
                a.get("alert_type", ""),
                a.get("message", ""),
                a.get("created_at", ""),
                a.get("status", "active"),
                a.get("acknowledged", False)
            ])
        filename = f"marine_engine_alerts_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    elif data_type == "remediation":
        actions = await list_remediation_actions(engine_id=engine_id, limit=1000)
        writer.writerow(["Action_ID", "Engine_ID", "Action", "Priority", "Category", "Trigger_Param", "Observed_Val", "Status", "Assigned_To", "Created_At"])
        for act in actions:
            writer.writerow([
                act.get("action_id", ""),
                act.get("engine_id", ""),
                act.get("action", ""),
                act.get("priority", ""),
                act.get("category", ""),
                act.get("trigger_parameter", ""),
                act.get("observed_value", ""),
                act.get("status", ""),
                act.get("assigned_to", ""),
                act.get("created_at", "")
            ])
        filename = f"marine_engine_remediation_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    else: # sensors
        readings = await sensor_records_filtered(engine_id=engine_id, start_time=start_date, end_time=end_date, limit=2000)
        writer.writerow([
            "Record_ID", "Engine_ID", "Timestamp", "Operating_Hours", "RPM",
            "Engine_Temperature_C", "Oil_Pressure_bar", "Vibration_mm_s",
            "Engine_Load_Percent", "Exhaust_Temperature_C", "Fuel_Consumption_L_hr",
            "Failure_Probability", "Engine_Condition", "Health_Score"
        ])
        for r in readings:
            writer.writerow([
                r.get("record_id", ""),
                r.get("engine_id", ""),
                r.get("timestamp", ""),
                r.get("operating_hours", ""),
                r.get("rpm", ""),
                r.get("engine_temperature_c", ""),
                r.get("oil_pressure_bar", ""),
                r.get("vibration_mm_s", ""),
                r.get("engine_load_percent", ""),
                r.get("exhaust_temperature_c", ""),
                r.get("fuel_consumption_l_hr", ""),
                r.get("failure_probability", ""),
                r.get("engine_condition", ""),
                r.get("engine_health_score", "")
            ])
        filename = f"marine_engine_telemetry_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
