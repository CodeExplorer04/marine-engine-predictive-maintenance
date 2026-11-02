from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any
from app.database import get_active_thresholds, update_active_thresholds, reset_to_default_thresholds

router = APIRouter()

class ThresholdUpdateRequest(BaseModel):
    thresholds: Dict[str, Any]
    user: str = "Admin"

@router.get("/")
async def get_thresholds():
    """Retrieve currently active sensor thresholds."""
    current = await get_active_thresholds()
    return {
        "status": "success",
        "thresholds": current
    }

@router.put("/")
async def update_thresholds(payload: ThresholdUpdateRequest):
    """Update sensor threshold configurations dynamically without restarting."""
    try:
        updated = await update_active_thresholds(payload.thresholds, user=payload.user)
        return {
            "status": "success",
            "message": "Dynamic sensor thresholds successfully updated in MongoDB.",
            "thresholds": updated
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset")
async def reset_thresholds(user: str = Body("Admin", embed=True)):
    """Reset all sensor thresholds to factory marine baseline specifications."""
    default = await reset_to_default_thresholds(user=user)
    return {
        "status": "success",
        "message": "Sensor thresholds reset to IMO marine safety baseline standards.",
        "thresholds": default
    }
