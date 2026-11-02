import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.config import PROJECT_ROOT

router = APIRouter()

COMPARISON_METRICS_PATH = Path(PROJECT_ROOT / "ml" / "models" / "models_comparison_metrics.json")
FAILURE_METRICS_PATH = Path(PROJECT_ROOT / "ml" / "models" / "failure_probability_metrics.json")

def load_metrics_json():
    if COMPARISON_METRICS_PATH.exists():
        with open(COMPARISON_METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

@router.get("/comparison")
async def get_model_comparison():
    data = load_metrics_json()
    if not data:
        raise HTTPException(status_code=404, detail="Model comparison metrics file not found. Run training script first.")
    return data

@router.get("/details/{model_abbr}")
async def get_model_detail(model_abbr: str):
    data = load_metrics_json()
    if not data:
        raise HTTPException(status_code=404, detail="Metrics not available")
    
    target = None
    for m in data.get("models", []):
        if m.get("abbr", "").lower() == model_abbr.lower() or m.get("name", "").lower() == model_abbr.lower():
            target = m
            break
            
    if not target:
        raise HTTPException(status_code=404, detail=f"Model '{model_abbr}' not found in comparison results")
        
    return {
        "dataset_name": data.get("dataset_name"),
        "dataset_rows": data.get("dataset_rows"),
        "model": target
    }
