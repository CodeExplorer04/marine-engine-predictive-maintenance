# Cloud-Based Marine Engine Health Monitoring and Predictive Maintenance

An industrial-grade IoT and machine learning platform for real-time marine engine health monitoring, thermodynamic anomaly detection, and predictive maintenance.

---

## 📌 Architecture Overview

```
┌─────────────────────────────────┐
│     Marine Engine Telemetry     │
│  (Sensor Simulator / IoT Nodes) │
└────────────────┬────────────────┘
                 │ HTTP Telemetry Stream
                 ▼
┌─────────────────────────────────┐
│         FastAPI Backend         │
│   • Pydantic Schema Validation  │
│   • ML Inference (Random Forest)│
│   • Dynamic Threshold Check     │
│   • Alert & Remediation Engine  │
└───────┬─────────────────┬───────┘
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   MongoDB    │   │  React UI    │
│  NoSQL Store │   │  Dashboard   │
└──────────────┘   └──────────────┘
```

The system connects live vessel telemetry with trained Scikit-learn predictive models to classify degradation risks (*Normal*, *Warning*, *High Risk*), continuously compute failure probabilities ($0.0 \to 1.0$) and engine health scores ($0 \to 100$), and dispatch automated maintenance work orders before catastrophic machinery failure occurs.

---

## 🚀 Key Features

1. **Real-Time Telemetry Streaming:** Ingestion of 8 critical thermodynamic and vibrational sensor streams (RPM, Temperature, Oil Pressure, Vibration, Load, Exhaust Gas Temperature, Fuel Consumption).
2. **Predictive Failure Scoring:** Evaluates real-time sensor readings against a serialized **Random Forest Regressor** ($R^2 = 0.9616$, $\text{MAE} = 0.0258$) to compute failure probabilities.
3. **Dynamic Safety Thresholds:** Configurable operational safety trip limits persisted to MongoDB that apply to live telemetry without requiring server restart.
4. **Smart Alerts & Event Log:** Severity-based notification pipeline (*Critical*, *Warning*, *Medium*, *Low*) with watchkeeper acknowledgment and resolution lifecycle.
5. **Automated Corrective Remediation:** Automatically proposes and queues engineering work orders (e.g., checking lube oil differential pressure, inspecting bearings, throttling back engine load) upon degradation detection.
6. **Multi-Model Benchmark Matrix:** Comparative evaluation comparing Random Forest, XGBoost, Decision Tree, and Logistic Regression models.
7. **Cloud Analytics & Data Export:** Fleet-wide statistical aggregations (min, mean, max, std dev) and direct streaming CSV export for marine compliance audits.
8. **Role-Based Access Control (RBAC):** Configured permission tiers for Fleet Administrators, Chief Engineers, Fleet Operators, and Safety Auditors.

---

## 🛠 Tech Stack

- **Backend:** Python 3.13, FastAPI (ASGI), Uvicorn, Pydantic v2
- **Machine Learning:** Scikit-learn, XGBoost, Pandas, NumPy, Joblib
- **Database:** MongoDB (via Motor async driver) with automatic in-memory fallback
- **Frontend:** React 19, Vite, Chart.js, React-Chartjs-2
- **Testing & Verification:** Comprehensive model benchmarking and UI validation suite

---

## 🏁 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) MongoDB running at `localhost:27017` (in-memory mode used if MongoDB is offline)

---

### 1. Backend Setup & Startup

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (if needed)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

- **API Root:** `http://127.0.0.1:8000`
- **Interactive Swagger Documentation:** `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup & Startup

```powershell
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Start the Vite development server
npm run dev
```

- **Dashboard Application:** `http://localhost:5173`

---

### 3. Continuous Telemetry Simulator (Optional)

```powershell
# In a third terminal, stream continuous telemetry
python simulator/sensor_simulator.py --scenario mixed --interval 3
```

---

## 📊 Monitored Telemetry Attributes

| Parameter | Engineering Unit | Nominal Range | Description |
| :--- | :---: | :---: | :--- |
| `Operating_Hours` | Hours (hrs) | 0 – 40,000 | Hours elapsed since major engine overhaul |
| `Engine_Load_Percent` | % | 30 – 100% | Maximum Continuous Rating (MCR) load percentage |
| `Engine_Temperature_C` | °C | 70 – 125°C | Cylinder jacket water coolant temperature |
| `Oil_Pressure_bar` | bar | 2.0 – 6.0 bar | Main lubricating header oil pressure |
| `RPM` | RPM | 600 – 2,200 RPM | Main propulsion shaft rotational speed |
| `Exhaust_Temperature_C` | °C | 250 – 550°C | Cylinder combustion exhaust gas pyrometer |
| `Vibration_mm_s` | mm/s | 0.5 – 12.0 mm/s | Structural oscillatory velocity (ISO 10816-6) |
| `Fuel_Consumption_L_hr` | L/hr | 100 – 350 L/hr | Volumetric fuel consumption flow rate |

---

## 📋 License

This project is licensed under the MIT License.
