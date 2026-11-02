from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional
from app.database import list_alerts, update_alert_status, alert_statistics

router = APIRouter()

@router.get("/")
async def get_alerts(
    engine_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    items = await list_alerts(engine_id=engine_id, severity=severity, status=status, limit=limit)
    stats = await alert_statistics()
    return {
        "count": len(items),
        "statistics": stats,
        "alerts": items
    }

@router.get("/stats")
async def get_alerts_stats():
    return await alert_statistics()

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert_endpoint(alert_id: str):
    res = await update_alert_status(alert_id=alert_id, status="acknowledged", acknowledged=True)
    if not res:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "status": "success",
        "message": f"Alert {alert_id} acknowledged by marine operator.",
        "alert": res
    }

@router.post("/{alert_id}/resolve")
async def resolve_alert_endpoint(alert_id: str):
    res = await update_alert_status(alert_id=alert_id, status="resolved", acknowledged=True)
    if not res:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "status": "success",
        "message": f"Alert {alert_id} marked as resolved.",
        "alert": res
    }
