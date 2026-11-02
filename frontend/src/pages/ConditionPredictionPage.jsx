import React, { useState, useEffect } from "react";
import { predictFailure, getLatestSensor } from "../services/api";
import RiskBadge from "../components/RiskBadge";

function ConditionPredictionPage({ engineId, sensor }) {
  const [formData, setFormData] = useState({
    engine_id: engineId,
    operating_hours: 8500,
    engine_load_percent: 65,
    engine_temperature_c: 88,
    oil_pressure_bar: 4.2,
    rpm: 1500,
    exhaust_temperature_c: 380,
    vibration_mm_s: 2.4,
    fuel_consumption_l_hr: 220,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const populateFromSensor = (src) => {
    if (!src) return;
    setFormData({
      engine_id: src.engine_id || engineId,
      operating_hours: Number(src.operating_hours ?? 8500),
      engine_load_percent: Number(src.engine_load_percent ?? src.engine_load ?? 65),
      engine_temperature_c: Number(src.engine_temperature_c ?? src.engine_temperature ?? 88),
      oil_pressure_bar: Number(src.oil_pressure_bar ?? src.oil_pressure ?? 4.2),
      rpm: Number(src.rpm ?? src.engine_rpm ?? 1500),
      exhaust_temperature_c: Number(src.exhaust_temperature_c ?? src.exhaust_temperature ?? 380),
      vibration_mm_s: Number(src.vibration_mm_s ?? src.vibration ?? 2.4),
      fuel_consumption_l_hr: Number(src.fuel_consumption_l_hr ?? src.fuel_consumption ?? 220),
    });
  };

  useEffect(() => {
    if (sensor) {
      populateFromSensor(sensor);
    }
  }, [sensor, engineId]);

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await predictFailure(formData);
      setPrediction(res);
    } catch (err) {
      setError(err.message || "Prediction request failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePredict();
  }, []);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: Number(val) }));
  };

  const failureProb = Number(prediction?.failure_probability_percent ?? 0);
  const healthScore = Number(prediction?.engine_health_score ?? 100);
  const condition = prediction?.engine_condition || "Normal";

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">MACHINE LEARNING INFERENCE</span>
          <h2>Engine Condition & Failure Prediction</h2>
          <p>
            Evaluate operational telemetry using the trained Random Forest regression & risk classification pipeline.
          </p>
        </div>
        <button
          className="action-btn secondary"
          onClick={() => sensor && populateFromSensor(sensor)}
          title="Reload latest live readings"
        >
          ↻ Load Live Telemetry
        </button>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="grid-2-col">
        {/* INPUT FORM */}
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Telemetry Feature Inputs</h3>
            <span className="badge-pill">{formData.engine_id}</span>
          </div>

          <form onSubmit={handlePredict} className="form-grid">
            <div className="form-group">
              <label>Operating Hours (hrs)</label>
              <input
                type="number"
                value={formData.operating_hours}
                onChange={(e) => handleChange("operating_hours", e.target.value)}
                min="0"
                step="10"
                required
              />
            </div>

            <div className="form-group">
              <label>Engine Load (%)</label>
              <input
                type="number"
                value={formData.engine_load_percent}
                onChange={(e) => handleChange("engine_load_percent", e.target.value)}
                min="0"
                max="100"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Engine Temperature (°C)</label>
              <input
                type="number"
                value={formData.engine_temperature_c}
                onChange={(e) => handleChange("engine_temperature_c", e.target.value)}
                min="0"
                max="200"
                step="0.5"
                required
              />
            </div>

            <div className="form-group">
              <label>Oil Pressure (bar)</label>
              <input
                type="number"
                value={formData.oil_pressure_bar}
                onChange={(e) => handleChange("oil_pressure_bar", e.target.value)}
                min="0"
                max="15"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label>Engine Speed (RPM)</label>
              <input
                type="number"
                value={formData.rpm}
                onChange={(e) => handleChange("rpm", e.target.value)}
                min="0"
                max="3000"
                step="10"
                required
              />
            </div>

            <div className="form-group">
              <label>Exhaust Temperature (°C)</label>
              <input
                type="number"
                value={formData.exhaust_temperature_c}
                onChange={(e) => handleChange("exhaust_temperature_c", e.target.value)}
                min="0"
                max="700"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Vibration (mm/s)</label>
              <input
                type="number"
                value={formData.vibration_mm_s}
                onChange={(e) => handleChange("vibration_mm_s", e.target.value)}
                min="0"
                max="25"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label>Fuel Consumption (L/hr)</label>
              <input
                type="number"
                value={formData.fuel_consumption_l_hr}
                onChange={(e) => handleChange("fuel_consumption_l_hr", e.target.value)}
                min="0"
                max="600"
                step="1"
                required
              />
            </div>

            <div className="form-full-row">
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Computing ML Inference..." : "⚡ Predict Engine Condition"}
              </button>
            </div>
          </form>
        </div>

        {/* PREDICTION RESULTS */}
        <div className="panel prediction-result-panel">
          <div className="panel-title-bar">
            <h3>Machine Learning Assessment</h3>
            <RiskBadge level={condition} />
          </div>

          <div className="kpi-score-container">
            <div className="kpi-gauge-box">
              <span className="gauge-label">HEALTH SCORE</span>
              <div className="big-score" style={{ color: healthScore > 70 ? "#38ef7d" : healthScore > 40 ? "#ffd166" : "#ff4d6d" }}>
                {healthScore}
                <small>/100</small>
              </div>
              <div className="progress-bar">
                <div
                  style={{
                    width: `${healthScore}%`,
                    backgroundColor: healthScore > 70 ? "#38ef7d" : healthScore > 40 ? "#ffd166" : "#ff4d6d",
                  }}
                />
              </div>
            </div>

            <div className="kpi-gauge-box">
              <span className="gauge-label">FAILURE PROBABILITY</span>
              <div className="big-score" style={{ color: failureProb < 35 ? "#38ef7d" : failureProb < 70 ? "#ffd166" : "#ff4d6d" }}>
                {failureProb.toFixed(1)}
                <small>%</small>
              </div>
              <div className="progress-bar">
                <div
                  style={{
                    width: `${Math.min(failureProb, 100)}%`,
                    backgroundColor: failureProb < 35 ? "#38ef7d" : failureProb < 70 ? "#ffd166" : "#ff4d6d",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="recommendation-card">
            <h4>Maintenance Recommendation</h4>
            <p>{prediction?.maintenance_recommendation || "Awaiting prediction analysis."}</p>
          </div>

          <div className="feature-impact-section">
            <h4>Primary Degradation Drivers</h4>
            <div className="impact-bar-row">
              <span>Vibration ({formData.vibration_mm_s} mm/s)</span>
              <div className="impact-bar-track">
                <div style={{ width: `${Math.min((formData.vibration_mm_s / 6) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="impact-bar-row">
              <span>Temperature ({formData.engine_temperature_c} °C)</span>
              <div className="impact-bar-track">
                <div style={{ width: `${Math.min((formData.engine_temperature_c / 120) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="impact-bar-row">
              <span>Oil Pressure ({formData.oil_pressure_bar} bar)</span>
              <div className="impact-bar-track">
                <div style={{ width: `${Math.max(100 - (formData.oil_pressure_bar / 5) * 100, 0)}%`, backgroundColor: "#ff9f1c" }} />
              </div>
            </div>
          </div>

          <div className="meta-tag">
            <span>Model: {prediction?.prediction_source || "trained_random_forest"}</span>
            <span>Target: Failure_Probability (0.00 – 1.00)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConditionPredictionPage;
