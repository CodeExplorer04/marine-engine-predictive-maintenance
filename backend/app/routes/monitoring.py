import os
import sys
import time
import platform
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter
from app.database import get_database_status, client, db
from app.config import PROJECT_ROOT, MODEL_PATH
from app.services.prediction_service import load_model

router = APIRouter()

START_TIME = time.time()

AZURE_READINESS_CHECKLIST = [
    {
        "item": "Docker Containerization",
        "description": "Dockerfile and docker-compose configurations present in repository",
        "status": "Configured",
        "details": "Ready for Azure Container Instances (ACI) or Azure App Service (Web App for Containers)"
    },
    {
        "item": "Terraform Infrastructure as Code",
        "description": "Terraform definitions for Resource Groups, AKS, and Storage Accounts in terraform/ directory",
        "status": "Configured",
        "details": "Preserved in repository for Azure Resource Manager deployment"
    },
    {
        "item": "Cosmos DB / MongoDB API Compatibility",
        "description": "Motor and PyMongo driver compatible with Azure Cosmos DB API for MongoDB",
        "status": "Ready",
        "details": "Supports connection string via MONGODB_URL environment variable"
    },
    {
        "item": "Environment Configuration Isolation",
        "description": "Secrets, database strings, and paths read securely via python-dotenv / environment variables",
        "status": "Verified",
        "details": "Production secrets protected without hardcoding"
    },
    {
        "item": "FastAPI ASGI Production Readiness",
        "description": "Uvicorn asynchronous worker lifecycle with CORS headers and health endpoints",
        "status": "Active",
        "details": "Ready for Gunicorn/Uvicorn multi-worker production deployment"
    }
]

@router.get("/status")
async def get_system_monitoring_status():
    uptime_seconds = int(time.time() - START_TIME)
    uptime_formatted = f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m {uptime_seconds % 60}s"
    
    # Check MongoDB ping time
    mongo_status = get_database_status()
    mongo_ping_ms = None
    collections_count = 0
    if client is not None:
        try:
            t0 = time.time()
            await client.admin.command("ping")
            mongo_ping_ms = round((time.time() - t0) * 1000, 2)
            if db is not None:
                colls = await db.list_collection_names()
                collections_count = len(colls)
        except Exception:
            mongo_status = "error"

    # Check ML models
    rf_model = load_model()
    rf_loaded = rf_model is not None
    rf_size_mb = round(MODEL_PATH.stat().st_size / (1024 * 1024), 2) if MODEL_PATH.exists() else 0.0

    iso_path = Path(PROJECT_ROOT / "ml" / "models" / "isolation_forest.joblib")
    iso_loaded = iso_path.exists()
    iso_size_mb = round(iso_path.stat().st_size / (1024 * 1024), 2) if iso_loaded else 0.0

    comparison_path = Path(PROJECT_ROOT / "ml" / "models" / "models_comparison_metrics.json")
    comparison_available = comparison_path.exists()

    # Telemetry statistics
    total_telemetry = 0
    latest_reading_time = None
    if db is not None:
        try:
            total_telemetry = await db.sensors.count_documents({})
            latest_doc = await db.sensors.find_one({}, sort=[("timestamp", -1)])
            if latest_doc:
                latest_reading_time = latest_doc.get("timestamp")
        except Exception:
            pass

    return {
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": {
            "seconds": uptime_seconds,
            "formatted": uptime_formatted,
            "boot_time": datetime.fromtimestamp(START_TIME, tz=timezone.utc).isoformat()
        },
        "environment": {
            "deployment_target": "Local Development (Azure Migration Ready)",
            "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
            "python_version": sys.version.split(" ")[0],
            "framework": "FastAPI + Uvicorn ASGI",
            "host": "127.0.0.1:8000"
        },
        "database": {
            "provider": "MongoDB (Local / Cosmos DB Compatible)",
            "status": mongo_status,
            "latency_ms": mongo_ping_ms,
            "database_name": "marine_engine_db",
            "collections_count": collections_count,
            "stored_telemetry_records": total_telemetry
        },
        "ml_inference_services": {
            "random_forest_regressor": {
                "loaded": rf_loaded,
                "model_file": MODEL_PATH.name,
                "size_mb": rf_size_mb,
                "status": "Ready" if rf_loaded else "Missing"
            },
            "isolation_forest_anomaly": {
                "loaded": iso_loaded,
                "model_file": iso_path.name,
                "size_mb": iso_size_mb,
                "status": "Ready" if iso_loaded else "Not trained"
            },
            "model_comparison_benchmark": {
                "available": comparison_available,
                "models_compared": 4,
                "status": "Available" if comparison_available else "Pending"
            }
        },
        "telemetry_stream": {
            "total_records_ingested": total_telemetry,
            "last_ingested_at": latest_reading_time,
            "simulator_integration": "Connected (HTTP Ingestion Pipeline)"
        },
        "azure_readiness_checklist": AZURE_READINESS_CHECKLIST
    }
