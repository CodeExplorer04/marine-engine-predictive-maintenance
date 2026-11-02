from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection, get_database_status
from app.routes import (
    sensors,
    prediction,
    anomaly,
    models,
    thresholds,
    alerts,
    remediation,
    maintenance,
    analytics,
    reports,
    auth,
    monitoring,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Cloud-Based Marine Engine Health Monitoring & Predictive Maintenance API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Feature Routers
app.include_router(sensors.router, prefix="/api/sensors", tags=["Sensors & Telemetry"])
app.include_router(prediction.router, prefix="/api/predict", tags=["ML Engine Condition Prediction"])
app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly Detection"])
app.include_router(models.router, prefix="/api/models", tags=["ML Model Comparison"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Predictive Maintenance"])
app.include_router(thresholds.router, prefix="/api/thresholds", tags=["Dynamic Thresholds"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Smart Alerts & Notifications"])
app.include_router(remediation.router, prefix="/api/remediation", tags=["Automated Remediation"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Cloud Data Analytics"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports & CSV Export"])
app.include_router(auth.router, prefix="/api/auth", tags=["Security & Access Control"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["System Monitoring & Azure Deployment"])

@app.get("/", tags=["Health"])
async def root():
    return {
        "project": "Cloud-Based Marine Engine Health Monitoring and Predictive Maintenance",
        "status": "online",
        "docs": "/docs",
        "api_version": "2.0.0"
    }

@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "database": get_database_status(),
        "service": "marine-engine-predictive-maintenance-api"
    }
