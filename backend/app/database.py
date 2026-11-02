from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
from app.config import MONGODB_URL, DATABASE_NAME

client = None
db = None

DEFAULT_THRESHOLDS = {
    "engine_temperature_c": {"warning": 95.0, "critical": 110.0, "unit": "°C", "min_limit": 60.0, "max_limit": 130.0},
    "oil_pressure_bar": {"warning_min": 3.0, "critical_min": 2.2, "unit": "bar", "min_limit": 1.0, "max_limit": 7.0},
    "vibration_mm_s": {"warning": 3.5, "critical": 4.8, "unit": "mm/s", "min_limit": 0.0, "max_limit": 15.0},
    "rpm": {"warning_max": 1800.0, "critical_max": 2000.0, "unit": "RPM", "min_limit": 500.0, "max_limit": 2500.0},
    "exhaust_temperature_c": {"warning": 440.0, "critical": 500.0, "unit": "°C", "min_limit": 200.0, "max_limit": 650.0},
    "engine_load_percent": {"warning": 85.0, "critical": 95.0, "unit": "%", "min_limit": 0.0, "max_limit": 100.0},
    "fuel_consumption_l_hr": {"warning": 280.0, "critical": 340.0, "unit": "L/hr", "min_limit": 100.0, "max_limit": 500.0},
}

_memory = {
    "sensors": [],
    "alerts": [],
    "anomalies": [],
    "remediation": [],
    "thresholds": dict(DEFAULT_THRESHOLDS),
    "users": []
}
_db_status = "memory_fallback"

async def connect_to_mongo():
    global client, db, _db_status
    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        await client.admin.command("ping")
        db = client[DATABASE_NAME]
        _db_status = "connected"
        await db.sensors.create_index([("engine_id", 1), ("timestamp", -1)])
        await db.alerts.create_index([("engine_id", 1), ("created_at", -1)])
        await db.anomalies.create_index([("engine_id", 1), ("timestamp", -1)])
        await db.remediation.create_index([("engine_id", 1), ("created_at", -1)])
        await db.users.create_index([("username", 1)], unique=True)
        # Ensure default thresholds exist in DB
        existing_th = await db.thresholds.find_one({"type": "active"})
        if not existing_th:
            await db.thresholds.insert_one({"type": "active", "values": DEFAULT_THRESHOLDS, "updated_at": datetime.now(timezone.utc)})
    except Exception:
        _db_status = "memory_fallback"
        if client:
            client.close()
        client = None
        db = None

async def close_mongo_connection():
    global client
    if client:
        client.close()
        client = None

def get_database_status():
    return _db_status

def _serialise(doc: dict[str, Any]) -> dict[str, Any]:
    if not doc:
        return doc
    result = dict(doc)
    if "_id" in result:
        result["_id"] = str(result["_id"])
    return result

# ----------------- SENSORS -----------------

async def insert_sensor(record: dict):
    record = {**record, "timestamp": record.get("timestamp") or datetime.now(timezone.utc)}
    if db is not None:
        try:
            result = await db.sensors.insert_one(record)
            record["record_id"] = str(result.inserted_id)
            return _serialise(record)
        except PyMongoError:
            pass
    record["record_id"] = f"mem-{len(_memory['sensors']) + 1}"
    _memory["sensors"].append(record)
    return _serialise(record)

async def latest_sensor(engine_id: str):
    if db is not None:
        try:
            doc = await db.sensors.find_one({"engine_id": engine_id}, sort=[("timestamp", -1)])
            if doc:
                doc["record_id"] = str(doc.get("_id", ""))
                return _serialise(doc)
        except PyMongoError:
            pass
    matches = [x for x in _memory["sensors"] if x["engine_id"] == engine_id]
    return _serialise(max(matches, key=lambda x: str(x["timestamp"]))) if matches else None

async def sensor_history(engine_id: str, limit: int = 100):
    if db is not None:
        try:
            cursor = db.sensors.find({"engine_id": engine_id}).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            return [_serialise({**d, "record_id": str(d.get("_id", ""))}) for d in docs]
        except PyMongoError:
            pass
    matches = [x for x in _memory["sensors"] if x["engine_id"] == engine_id]
    return [_serialise(x) for x in sorted(matches, key=lambda x: str(x["timestamp"]), reverse=True)[:limit]]

async def list_engines():
    if db is not None:
        try:
            engine_ids = await db.sensors.distinct("engine_id")
            if engine_ids:
                engines_summary = []
                for eid in sorted(engine_ids):
                    latest = await latest_sensor(eid)
                    engines_summary.append({
                        "engine_id": eid,
                        "status": latest.get("engine_condition", "Normal") if latest else "Unknown",
                        "health_score": latest.get("engine_health_score", 100) if latest else 100,
                        "failure_probability": latest.get("failure_probability", 0.0) if latest else 0.0,
                        "last_updated": latest.get("timestamp") if latest else None,
                        "rpm": latest.get("rpm", 0) if latest else 0,
                        "temperature": latest.get("engine_temperature_c", 0) if latest else 0,
                    })
                return engines_summary
        except PyMongoError:
            pass
    # Memory fallback
    ids = sorted({x["engine_id"] for x in _memory["sensors"]})
    if not ids:
        ids = ["ENGINE-001", "ENGINE-002", "ENGINE-003", "ENGINE-004"]
    res = []
    for eid in ids:
        matches = [x for x in _memory["sensors"] if x["engine_id"] == eid]
        latest = max(matches, key=lambda x: str(x["timestamp"])) if matches else None
        res.append({
            "engine_id": eid,
            "status": latest.get("engine_condition", "Normal") if latest else "Normal",
            "health_score": latest.get("engine_health_score", 95) if latest else 95,
            "failure_probability": latest.get("failure_probability", 0.05) if latest else 0.05,
            "last_updated": latest.get("timestamp") if latest else datetime.now(timezone.utc).isoformat(),
            "rpm": latest.get("rpm", 1400) if latest else 1400,
            "temperature": latest.get("engine_temperature_c", 82) if latest else 82,
        })
    return res

async def sensor_records_filtered(engine_id: str | None = None, start_time: str | None = None, end_time: str | None = None, limit: int = 500):
    query = {}
    if engine_id and engine_id != "all":
        query["engine_id"] = engine_id
    if start_time or end_time:
        t_query = {}
        if start_time:
            t_query["$gte"] = start_time
        if end_time:
            t_query["$lte"] = end_time
        query["timestamp"] = t_query

    if db is not None:
        try:
            docs = await db.sensors.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
            return [_serialise({**d, "record_id": str(d.get("_id", ""))}) for d in docs]
        except PyMongoError:
            pass
    # Memory fallback
    results = _memory["sensors"]
    if engine_id and engine_id != "all":
        results = [x for x in results if x.get("engine_id") == engine_id]
    return [_serialise(x) for x in sorted(results, key=lambda x: str(x.get("timestamp", "")), reverse=True)[:limit]]

# ----------------- ALERTS -----------------

async def insert_alert(alert: dict):
    alert = {**alert, "created_at": alert.get("created_at") or datetime.now(timezone.utc), "status": alert.get("status") or "active"}
    if db is not None:
        try:
            result = await db.alerts.insert_one(alert)
            alert["alert_id"] = str(result.inserted_id)
            return _serialise(alert)
        except PyMongoError:
            pass
    alert["alert_id"] = f"mem-alert-{len(_memory['alerts']) + 1}"
    _memory["alerts"].append(alert)
    return _serialise(alert)

async def list_alerts(engine_id: str | None = None, severity: str | None = None, status: str | None = None, limit: int = 100):
    query = {}
    if engine_id and engine_id != "all":
        query["engine_id"] = engine_id
    if severity and severity != "all":
        query["severity"] = severity
    if status and status != "all":
        query["status"] = status

    if db is not None:
        try:
            docs = await db.alerts.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
            return [_serialise({**d, "alert_id": str(d.get("_id", ""))}) for d in docs]
        except PyMongoError:
            pass
    items = _memory["alerts"]
    if engine_id and engine_id != "all":
        items = [a for a in items if a.get("engine_id") == engine_id]
    if severity and severity != "all":
        items = [a for a in items if a.get("severity") == severity]
    if status and status != "all":
        items = [a for a in items if a.get("status") == status]
    return [_serialise(x) for x in sorted(items, key=lambda x: str(x.get("created_at", "")), reverse=True)[:limit]]

async def update_alert_status(alert_id: str, status: str, acknowledged: bool = True):
    now = datetime.now(timezone.utc)
    if db is not None:
        try:
            oid = ObjectId(alert_id) if ObjectId.is_valid(alert_id) else None
            filter_query = {"_id": oid} if oid else {"alert_id": alert_id}
            update_data = {"$set": {"status": status, "acknowledged": acknowledged, "updated_at": now}}
            res = await db.alerts.find_one_and_update(filter_query, update_data, return_document=True)
            if res:
                return _serialise({**res, "alert_id": str(res.get("_id", ""))})
        except PyMongoError:
            pass
    for item in _memory["alerts"]:
        if item.get("alert_id") == alert_id:
            item["status"] = status
            item["acknowledged"] = acknowledged
            item["updated_at"] = now
            return _serialise(item)
    return None

async def alert_statistics():
    alerts = await list_alerts(limit=500)
    total = len(alerts)
    active = sum(1 for a in alerts if a.get("status") == "active" or not a.get("acknowledged"))
    critical = sum(1 for a in alerts if a.get("severity") in ["critical", "high"])
    warning = sum(1 for a in alerts if a.get("severity") in ["warning", "medium"])
    resolved = sum(1 for a in alerts if a.get("status") == "resolved")
    return {
        "total": total,
        "active": active,
        "critical": critical,
        "warning": warning,
        "resolved": resolved
    }

# ----------------- ANOMALIES -----------------

async def insert_anomaly(anomaly: dict):
    anomaly = {**anomaly, "timestamp": anomaly.get("timestamp") or datetime.now(timezone.utc)}
    if db is not None:
        try:
            result = await db.anomalies.insert_one(anomaly)
            anomaly["anomaly_id"] = str(result.inserted_id)
            return _serialise(anomaly)
        except PyMongoError:
            pass
    anomaly["anomaly_id"] = f"mem-anomaly-{len(_memory['anomalies']) + 1}"
    _memory["anomalies"].append(anomaly)
    return _serialise(anomaly)

async def list_anomalies(engine_id: str | None = None, limit: int = 50):
    query = {"engine_id": engine_id} if (engine_id and engine_id != "all") else {}
    if db is not None:
        try:
            docs = await db.anomalies.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
            return [_serialise({**d, "anomaly_id": str(d.get("_id", ""))}) for d in docs]
        except PyMongoError:
            pass
    items = _memory["anomalies"]
    if engine_id and engine_id != "all":
        items = [x for x in items if x.get("engine_id") == engine_id]
    return [_serialise(x) for x in sorted(items, key=lambda x: str(x.get("timestamp", "")), reverse=True)[:limit]]

# ----------------- REMEDIATION / MAINTENANCE ACTIONS -----------------

async def insert_remediation_action(action: dict):
    action = {
        **action,
        "created_at": action.get("created_at") or datetime.now(timezone.utc),
        "status": action.get("status") or "Pending"
    }
    if db is not None:
        try:
            result = await db.remediation.insert_one(action)
            action["action_id"] = str(result.inserted_id)
            return _serialise(action)
        except PyMongoError:
            pass
    action["action_id"] = f"mem-act-{len(_memory['remediation']) + 1}"
    _memory["remediation"].append(action)
    return _serialise(action)

async def list_remediation_actions(engine_id: str | None = None, status: str | None = None, limit: int = 100):
    query = {}
    if engine_id and engine_id != "all":
        query["engine_id"] = engine_id
    if status and status != "all":
        query["status"] = status
    if db is not None:
        try:
            docs = await db.remediation.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
            if docs:
                return [_serialise({**d, "action_id": str(d.get("_id", ""))}) for d in docs]
        except PyMongoError:
            pass
    items = _memory["remediation"]
    if engine_id and engine_id != "all":
        items = [x for x in items if x.get("engine_id") == engine_id]
    if status and status != "all":
        items = [x for x in items if x.get("status") == status]
    return [_serialise(x) for x in sorted(items, key=lambda x: str(x.get("created_at", "")), reverse=True)[:limit]]

async def update_remediation_status(action_id: str, status: str, completed_by: str | None = None, notes: str | None = None):
    now = datetime.now(timezone.utc)
    if db is not None:
        try:
            oid = ObjectId(action_id) if ObjectId.is_valid(action_id) else None
            filter_query = {"_id": oid} if oid else {"action_id": action_id}
            update_data = {"$set": {"status": status, "updated_at": now}}
            if completed_by:
                update_data["$set"]["completed_by"] = completed_by
            if notes:
                update_data["$set"]["notes"] = notes
            res = await db.remediation.find_one_and_update(filter_query, update_data, return_document=True)
            if res:
                return _serialise({**res, "action_id": str(res.get("_id", ""))})
        except PyMongoError:
            pass
    for item in _memory["remediation"]:
        if item.get("action_id") == action_id:
            item["status"] = status
            item["updated_at"] = now
            if completed_by:
                item["completed_by"] = completed_by
            if notes:
                item["notes"] = notes
            return _serialise(item)
    return None

# ----------------- THRESHOLDS -----------------

async def get_active_thresholds() -> dict:
    if db is not None:
        try:
            doc = await db.thresholds.find_one({"type": "active"})
            if doc and "values" in doc:
                return doc["values"]
        except PyMongoError:
            pass
    return _memory["thresholds"]

async def update_active_thresholds(new_thresholds: dict, user: str = "Admin") -> dict:
    now = datetime.now(timezone.utc)
    merged = {**DEFAULT_THRESHOLDS, **new_thresholds}
    if db is not None:
        try:
            await db.thresholds.update_one(
                {"type": "active"},
                {"$set": {"values": merged, "updated_at": now, "updated_by": user}},
                upsert=True
            )
            # Log threshold change audit
            await db.threshold_audit.insert_one({
                "timestamp": now,
                "updated_by": user,
                "values": merged
            })
            return merged
        except PyMongoError:
            pass
    _memory["thresholds"] = merged
    return merged

async def reset_to_default_thresholds(user: str = "Admin") -> dict:
    return await update_active_thresholds(DEFAULT_THRESHOLDS, user=user)

# ----------------- DASHBOARD & ANALYTICS -----------------

async def dashboard_summary():
    engines = await list_engines()
    total_alerts = await alert_statistics()
    normal_cnt = sum(1 for e in engines if e.get("status") == "Normal")
    warning_cnt = sum(1 for e in engines if e.get("status") == "Warning")
    high_risk_cnt = sum(1 for e in engines if e.get("status") == "High Risk")
    avg_health = round(sum(e.get("health_score", 100) for e in engines) / max(1, len(engines)), 1)
    
    total_readings = 0
    if db is not None:
        try:
            total_readings = await db.sensors.count_documents({})
        except PyMongoError:
            total_readings = len(_memory["sensors"])
    else:
        total_readings = len(_memory["sensors"])

    return {
        "total_readings": total_readings,
        "engines_monitored": len(engines),
        "fleet_health_score": avg_health,
        "condition_counts": {
            "normal": normal_cnt,
            "warning": warning_cnt,
            "high_risk": high_risk_cnt
        },
        "alerts_summary": total_alerts,
        "engines": engines
    }

