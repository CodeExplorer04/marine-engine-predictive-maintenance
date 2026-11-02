from fastapi import APIRouter, Query, HTTPException
from app.schemas.sensors import PredictionRequest
from app.services.anomaly_service import detect_anomalies
from app.database import list_anomalies, latest_sensor

router = APIRouter()

@router.post("/detect")
async def detect_sensor_anomaly(request: PredictionRequest):
    data = request.model_dump()
    result = await detect_anomalies(data, save_if_anomaly=False)
    return result

@router.get("/history/{engine_id}")
async def get_anomaly_history(engine_id: str, limit: int = Query(50, ge=1, le=500)):
    items = await list_anomalies(engine_id=engine_id, limit=limit)
    return {
        "engine_id": engine_id,
        "count": len(items),
        "anomalies": items
    }

@router.get("/stats")
async def get_anomaly_stats():
    anomalies = await list_anomalies(limit=200)
    total = len(anomalies)
    critical_cnt = sum(1 for a in anomalies if a.get("severity") == "critical")
    warning_cnt = sum(1 for a in anomalies if a.get("severity") == "warning")
    iso_cnt = sum(1 for a in anomalies if a.get("isolation_forest_anomaly"))

    # Count affected parameters
    param_counts = {}
    for a in anomalies:
        for p in a.get("abnormal_parameters", []):
            name = p.get("parameter", "Unknown")
            param_counts[name] = param_counts.get(name, 0) + 1

    return {
        "total_anomalies": total,
        "critical_count": critical_cnt,
        "warning_count": warning_cnt,
        "isolation_forest_detections": iso_cnt,
        "parameter_frequency": param_counts,
        "recent_anomalies": anomalies[:10]
    }
