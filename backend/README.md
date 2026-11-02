# Marine Engine Predictive Maintenance Backend

FastAPI backend for sensor readings, failure-probability prediction, risk classification, alerts, and dashboard analytics.

## 1. Setup (Windows PowerShell)

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` if your MongoDB URL or model path differs.

## 2. Run

From inside `backend`:

```powershell
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

MongoDB is used when available. If it is unavailable, the API uses in-memory storage for local demos; memory data disappears when the server restarts.

## 3. Endpoints

- `GET /` API information
- `GET /api/health` API/database status
- `POST /api/sensors/` save a sensor reading, calculate risk, and create an alert if needed
- `GET /api/sensors/latest/{engine_id}` latest reading
- `GET /api/sensors/history/{engine_id}?limit=100` recent readings
- `POST /api/predict/` calculate failure probability and health score
- `GET /api/alerts/?engine_id=ENGINE-01` list alerts
- `GET /api/analytics/summary` dashboard counts
- `GET /api/analytics/engine/{engine_id}` engine trend data

## 4. Example request

POST `/api/sensors/`:

```json
{
  "engine_id": "ENGINE-01",
  "operating_hours": 8200,
  "engine_load_percent": 72,
  "engine_temperature_c": 88,
  "oil_pressure_bar": 3.1,
  "rpm": 1800,
  "exhaust_temperature_c": 390,
  "vibration_mm_s": 5.2,
  "fuel_consumption_l_hr": 42
}
```

## Important ML note

The trained model is expected at `ml/models/failure_probability_model.joblib` relative to the project root. This project previously used a Random Forest **regressor**, so its output is treated as a probability in the 0–1 range. If the model file is missing, a clearly labelled fallback heuristic is used so API development can continue. Do not present fallback outputs as trained-model results. Validate the model's target scale and feature order before deployment.

## Production checklist

- Add authentication/authorization before exposing the API publicly.
- Restrict CORS origins to your deployed frontend.
- Use TLS and secret management for deployment.
- Add tests, logging, retention policies, and monitored model-version metadata.
- Do not rely on this demo model alone for real marine-engine safety decisions.
