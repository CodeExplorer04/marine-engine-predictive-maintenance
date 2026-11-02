from fastapi import APIRouter
from app.schemas.sensors import PredictionRequest
from app.services.prediction_service import predict

router = APIRouter()

@router.post("/")
async def predict_engine_failure(request: PredictionRequest):
    return predict(request.model_dump())
