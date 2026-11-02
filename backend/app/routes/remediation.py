from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional
from app.database import list_remediation_actions, update_remediation_status, insert_remediation_action

router = APIRouter()

class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Pending, In Progress, or Completed")
    completed_by: Optional[str] = "Duty Marine Engineer"
    notes: Optional[str] = None

class CustomActionRequest(BaseModel):
    engine_id: str
    action: str
    priority: str = "Medium"
    category: str = "Corrective Maintenance"
    safety_advisory: str = "Follow standard marine engineering safety procedures."
    assigned_to: str = "Marine Engineer"
    estimated_duration_hours: float = 2.0

@router.get("/actions")
async def get_remediation_actions(
    engine_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500)
):
    actions = await list_remediation_actions(engine_id=engine_id, status=status, limit=limit)
    pending_cnt = sum(1 for a in actions if a.get("status") == "Pending")
    in_prog_cnt = sum(1 for a in actions if a.get("status") == "In Progress")
    comp_cnt = sum(1 for a in actions if a.get("status") == "Completed")
    return {
        "count": len(actions),
        "pending": pending_cnt,
        "in_progress": in_prog_cnt,
        "completed": comp_cnt,
        "actions": actions
    }

@router.post("/actions/{action_id}/status")
async def update_action(action_id: str, payload: StatusUpdateRequest):
    updated = await update_remediation_status(
        action_id=action_id,
        status=payload.status,
        completed_by=payload.completed_by,
        notes=payload.notes
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Remediation action task not found")
    return {
        "status": "success",
        "message": f"Action marked as {payload.status}",
        "action": updated
    }

@router.post("/actions/create")
async def create_manual_action(payload: CustomActionRequest):
    data = payload.model_dump()
    data["trigger_parameter"] = "Manual Engineering Order"
    data["observed_value"] = "Preventive Dispatch"
    data["threshold_limit"] = "Standard Maintenance Schedule"
    saved = await insert_remediation_action(data)
    return {
        "status": "success",
        "message": "Maintenance action created and queued.",
        "action": saved
    }
