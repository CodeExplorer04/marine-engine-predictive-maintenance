# Marine Engine Predictive Maintenance — Database Architecture & Schema

## 1. Overview
The system uses **MongoDB** as its primary persistence engine, operating with the database name `marine_engine_db`.

* **Database Engine:** MongoDB NoSQL Document Store (v5.x / v6.x / v7.x)
* **Driver:** Asynchronous `motor` (`AsyncIOMotorClient`) with PyMongo
* **Default URI:** `mongodb://localhost:27017`
* **Cloud Migration Target:** Microsoft Azure Cosmos DB (API for MongoDB)
* **High Availability:** Non-blocking connection timeout with automatic in-memory fallback for local development resilience.

---

## 2. Collections & Schema Specifications

### 2.1 Collection: `sensors`
Stores time-series marine engine telemetry, machine learning predictions, and health scores.

**Compound Index:** `[("engine_id", 1), ("timestamp", -1)]`

```json
{
  "_id": ObjectId("6acb34c1e179f7192c269f84"),
  "record_id": "6acb34c1e179f7192c269f84",
  "engine_id": "ENGINE-001",
  "timestamp": ISODate("2026-10-11T07:03:29.734Z"),
  "operating_hours": 12450.1,
  "rpm": 1591.76,
  "engine_temperature_c": 85.74,
  "oil_pressure_bar": 4.12,
  "vibration_mm_s": 2.59,
  "engine_load_percent": 62.0,
  "exhaust_temperature_c": 372.4,
  "fuel_consumption_l_hr": 218.5,
  "coolant_temperature": 75.3,
  "ambient_temperature": 28.4,
  "failure_probability": 0.3505,
  "engine_condition": "Warning",
  "engine_health_score": 65,
  "is_anomaly": false,
  "anomaly_severity": "normal"
}
```

---

### 2.2 Collection: `alerts`
Stores threshold breach alarms and high-risk degradation warnings.

**Compound Index:** `[("engine_id", 1), ("created_at", -1)]`

```json
{
  "_id": ObjectId("6acb34c1e179f7192c269f85"),
  "alert_id": "6acb34c1e179f7192c269f85",
  "engine_id": "ENGINE-002",
  "alert_type": "failure_risk",
  "severity": "critical",
  "message": "Engine failure probability is 78.27%. Stop and inspect the engine as soon as safely possible.",
  "failure_probability": 0.7827,
  "engine_condition": "High Risk",
  "created_at": ISODate("2026-10-11T07:03:29.960Z"),
  "status": "active",
  "acknowledged": false
}
```

---

### 2.3 Collection: `anomalies`
Stores multi-dimensional outlier events detected by the Scikit-learn Isolation Forest model and active IMO safety threshold violations.

**Compound Index:** `[("engine_id", 1), ("timestamp", -1)]`

```json
{
  "_id": ObjectId("6acb34c1e179f7192c269f88"),
  "anomaly_id": "6acb34c1e179f7192c269f88",
  "engine_id": "ENGINE-002",
  "timestamp": ISODate("2026-10-11T07:03:29.734Z"),
  "is_anomaly": true,
  "severity": "critical",
  "isolation_forest_anomaly": true,
  "isolation_forest_score": -0.0738,
  "abnormal_parameters": [
    {
      "parameter": "Vibration",
      "field": "vibration_mm_s",
      "value": 6.5,
      "threshold": 4.8,
      "unit": "mm/s",
      "severity": "critical",
      "implication": "Severe structural oscillation or main journal bearing wear"
    },
    {
      "parameter": "Engine Temperature",
      "field": "engine_temperature_c",
      "value": 114.85,
      "threshold": 110.0,
      "unit": "°C",
      "severity": "critical",
      "implication": "Coolant system thermal runaway or heat exchanger fouling"
    },
    {
      "parameter": "Oil Pressure",
      "field": "oil_pressure_bar",
      "value": 2.06,
      "threshold": 2.2,
      "unit": "bar",
      "severity": "critical",
      "implication": "Critical lubrication oil pressure loss — risk of crankshaft seizure"
    }
  ],
  "parameter_violation_count": 3,
  "diagnosis": "Vibration (6.5mm/s): Severe oscillation; Temperature (114.85°C): Overheating; Oil Pressure (2.06bar): Lube loss"
}
```

---

### 2.4 Collection: `remediation`
Stores automated preventive work orders and corrective maintenance actions.

**Compound Index:** `[("engine_id", 1), ("created_at", -1)]`

```json
{
  "_id": ObjectId("6acb34c1e179f7192c269f86"),
  "action_id": "6acb34c1e179f7192c269f86",
  "engine_id": "ENGINE-002",
  "action": "Initiate comprehensive engineering diagnostic survey and reduce engine load by 25%.",
  "trigger_parameter": "Multi-Sensor Risk Matrix",
  "observed_value": "Condition: High Risk",
  "threshold_limit": "Failure Probability >= 70%",
  "priority": "Urgent",
  "category": "Operational Safety",
  "safety_advisory": "Adhere to IMO STCW watchkeeping safety standing orders.",
  "estimated_duration_hours": 3.0,
  "status": "Pending",
  "assigned_to": "Chief Engineer",
  "created_at": "2026-10-11T07:03:29.962063+00:00",
  "completed_at": null,
  "notes": null
}
```

---

### 2.5 Collection: `thresholds`
Stores dynamically configurable sensor limits that take effect immediately across all routes without restarting the backend.

```json
{
  "type": "active",
  "updated_at": ISODate("2026-10-11T07:00:00Z"),
  "updated_by": "Chief Engineer",
  "values": {
    "engine_temperature_c": { "warning": 95.0, "critical": 110.0, "unit": "°C", "min_limit": 60.0, "max_limit": 130.0 },
    "oil_pressure_bar": { "warning_min": 3.0, "critical_min": 2.2, "unit": "bar", "min_limit": 1.0, "max_limit": 7.0 },
    "vibration_mm_s": { "warning": 3.5, "critical": 4.8, "unit": "mm/s", "min_limit": 0.0, "max_limit": 15.0 },
    "rpm": { "warning_max": 1800.0, "critical_max": 2000.0, "unit": "RPM", "min_limit": 500.0, "max_limit": 2500.0 },
    "exhaust_temperature_c": { "warning": 440.0, "critical": 500.0, "unit": "°C", "min_limit": 200.0, "max_limit": 650.0 },
    "engine_load_percent": { "warning": 85.0, "critical": 95.0, "unit": "%", "min_limit": 0.0, "max_limit": 100.0 },
    "fuel_consumption_l_hr": { "warning": 280.0, "critical": 340.0, "unit": "L/hr", "min_limit": 100.0, "max_limit": 500.0 }
  }
}
```

---

### 2.6 Collection: `users`
Stores authenticated personnel accounts, salted Bcrypt password hashes, and Role-Based Access Control (RBAC) permissions.

**Unique Index:** `[("username", 1)]`

| Username | Role | Department | Password (Default) |
|---|---|---|---|
| `admin` | Administrator | Fleet Engineering Command | `Admin@Marine2026` |
| `engineer` | Chief Engineer | Propulsion & Machinery | `Engineer@Marine2026` |
| `operator` | Fleet Operator | Watchkeeping & Monitoring | `Operator@Marine2026` |
| `auditor` | Safety Auditor | Maritime Safety & Compliance | `Auditor@Marine2026` |

---

## 3. How to Inspect Database Records

1. **Via FastAPI Endpoints:**
   * Latest Telemetry: `GET http://127.0.0.1:8000/api/sensors/latest/ENGINE-001`
   * Historical Records: `GET http://127.0.0.1:8000/api/sensors/history/ENGINE-001?limit=20`
   * Stored Alerts: `GET http://127.0.0.1:8000/api/alerts/`
   * Remediation Tasks: `GET http://127.0.0.1:8000/api/remediation/actions`
   * Export Full CSV: `GET http://127.0.0.1:8000/api/reports/export-csv?data_type=sensors`

2. **Via MongoDB Compass GUI:**
   * Connect to: `mongodb://localhost:27017`
   * Select database: `marine_engine_db`

3. **Via Mongo Shell (`mongosh`):**
   ```bash
   mongosh
   use marine_engine_db
   db.sensors.find().sort({timestamp: -1}).limit(5).pretty()
   db.alerts.find().pretty()
   ```
