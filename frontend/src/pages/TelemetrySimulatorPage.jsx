import React, { useState, useEffect } from "react";
import { triggerSimulation, getSensorHistory, getEnginesList } from "../services/api";

function TelemetrySimulatorPage({ engineId, setEngineId, onReadingIngested }) {
  const [history, setHistory] = useState([]);
  const [engines, setEngines] = useState([]);
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [simInterval, setSimInterval] = useState(3);
  const [simScenario, setSimScenario] = useState("mixed");
  const [loading, setLoading] = useState(false);
  const [lastInjected, setLastInjected] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const hist = await getSensorHistory(engineId, 25);
      setHistory(hist.readings || []);

      const engList = await getEnginesList();
      setEngines(engList || []);
    } catch (err) {
      setError(err.message || "Failed to fetch telemetry history.");
    }
  };

  useEffect(() => {
    loadData();
  }, [engineId]);

  // Handle auto-stream interval
  useEffect(() => {
    let timer = null;
    if (isAutoStreaming) {
      timer = setInterval(() => {
        handleTriggerSimulation(simScenario, false);
      }, simInterval * 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoStreaming, simInterval, simScenario, engineId]);

  const handleTriggerSimulation = async (scenario, showBanner = true) => {
    try {
      setLoading(true);
      setError("");
      const res = await triggerSimulation(engineId, scenario);
      setLastInjected(res);
      if (showBanner) {
        setMessage(`Injected ${scenario.toUpperCase()} telemetry pulse for ${engineId}.`);
      }
      await loadData();
      if (onReadingIngested) {
        onReadingIngested(res.reading);
      }
    } catch (err) {
      setError(err.message || "Simulation injection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">TELEMETRY INGESTION PIPELINE</span>
          <h2>Live Sensor Telemetry & Simulator Control</h2>
          <p>
            Generate and stream synthetic marine telemetry across vessels. Academic demonstration only &ndash; not live physical vessel data.
          </p>
        </div>
        <div className="header-actions">
          <button
            className={`action-btn ${isAutoStreaming ? "critical" : "primary"}`}
            onClick={() => setIsAutoStreaming(!isAutoStreaming)}
          >
            {isAutoStreaming ? "⏹ Stop Auto-Stream" : "▶ Start Auto-Stream"}
          </button>
        </div>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      {/* QUICK INJECTION CONTROLS */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Interactive Scenario Injection ({engineId})</h3>
          <span className="badge-pill">Target: {engineId}</span>
        </div>

        <p className="small-desc">
          Click any scenario button below to instantly submit a synthetic reading through the FastAPI validation pipeline, compute ML failure probabilities, test anomaly alarms, and trigger maintenance remediation.
        </p>

        <div className="sim-button-row">
          <button
            className="sim-btn scenario-normal"
            disabled={loading}
            onClick={() => handleTriggerSimulation("normal")}
          >
            <strong>🟢 Inject Normal Condition</strong>
            <small>Temp 75–92°C, Vib 1.0–2.8 mm/s, Low Risk</small>
          </button>

          <button
            className="sim-btn scenario-warning"
            disabled={loading}
            onClick={() => handleTriggerSimulation("warning")}
          >
            <strong>🟡 Inject Warning Condition</strong>
            <small>Temp 92–108°C, Vib 2.9–4.3 mm/s, Moderate Risk</small>
          </button>

          <button
            className="sim-btn scenario-critical"
            disabled={loading}
            onClick={() => handleTriggerSimulation("high_risk")}
          >
            <strong>🔴 Inject High-Risk State</strong>
            <small>Temp 109–126°C, Vib 4.5–6.8 mm/s, Critical Trip</small>
          </button>

          <button
            className="sim-btn scenario-mixed"
            disabled={loading}
            onClick={() => handleTriggerSimulation("mixed")}
          >
            <strong>🎲 Random Mixed Telemetry</strong>
            <small>Stochastic weighted marine operational cycle</small>
          </button>
        </div>

        {/* STREAMING SETTINGS */}
        <div className="streaming-settings-bar">
          <div className="setting-item">
            <label>Auto-Stream Scenario:</label>
            <select value={simScenario} onChange={(e) => setSimScenario(e.target.value)}>
              <option value="mixed">Mixed Operational Cycle</option>
              <option value="normal">Sustained Normal</option>
              <option value="warning">Sustained Degradation</option>
              <option value="high_risk">Sustained High Risk</option>
            </select>
          </div>

          <div className="setting-item">
            <label>Interval Rate:</label>
            <select value={simInterval} onChange={(e) => setSimInterval(Number(e.target.value))}>
              <option value="2">2 seconds (High Frequency)</option>
              <option value="3">3 seconds (Standard)</option>
              <option value="5">5 seconds (Moderate)</option>
              <option value="10">10 seconds (Slow)</option>
            </select>
          </div>

          <div className="streaming-indicator">
            <span className={`pulse-dot ${isAutoStreaming ? "active" : "inactive"}`} />
            <span>{isAutoStreaming ? `Streaming active (${simInterval}s)` : "Stream paused"}</span>
          </div>
        </div>
      </div>

      {/* LATEST INGESTION SNAPSHOT */}
      {lastInjected && (
        <div className="panel highlight-panel">
          <div className="panel-title-bar">
            <h3>Latest Ingested Record Output</h3>
            <span className={`status-pill ${lastInjected.prediction?.engine_condition?.toLowerCase().replace(" ", "-")}`}>
              {lastInjected.prediction?.engine_condition}
            </span>
          </div>

          <div className="telemetry-snapshot-grid">
            <div className="snap-box">
              <span>Failure Probability</span>
              <strong>{lastInjected.prediction?.failure_probability_percent}%</strong>
            </div>
            <div className="snap-box">
              <span>Health Score</span>
              <strong>{lastInjected.prediction?.engine_health_score}/100</strong>
            </div>
            <div className="snap-box">
              <span>Vibration</span>
              <strong>{lastInjected.reading?.vibration_mm_s} mm/s</strong>
            </div>
            <div className="snap-box">
              <span>Engine Temperature</span>
              <strong>{lastInjected.reading?.engine_temperature_c} °C</strong>
            </div>
            <div className="snap-box">
              <span>Oil Pressure</span>
              <strong>{lastInjected.reading?.oil_pressure_bar} bar</strong>
            </div>
            <div className="snap-box">
              <span>Engine RPM</span>
              <strong>{lastInjected.reading?.rpm}</strong>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TELEMETRY STREAM TABLE */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Ingested Telemetry Stream ({engineId})</h3>
          <span className="badge-pill">{history.length} In-Memory/DB Records</span>
        </div>

        {history.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Hours</th>
                  <th>RPM</th>
                  <th>Temp (°C)</th>
                  <th>Oil (bar)</th>
                  <th>Vibration (mm/s)</th>
                  <th>Load (%)</th>
                  <th>Exhaust (°C)</th>
                  <th>ML Risk</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td>{row.operating_hours?.toFixed(1) || "5000.0"}</td>
                    <td>{Number(row.rpm ?? row.engine_rpm ?? 0).toFixed(0)}</td>
                    <td>{Number(row.engine_temperature_c ?? row.engine_temperature ?? 0).toFixed(1)}</td>
                    <td>{Number(row.oil_pressure_bar ?? row.oil_pressure ?? 0).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: Number(row.vibration_mm_s ?? row.vibration ?? 0) >= 4.0 ? "#ff4d6d" : "#e7eef6" }}>
                        {Number(row.vibration_mm_s ?? row.vibration ?? 0).toFixed(2)}
                      </strong>
                    </td>
                    <td>{Number(row.engine_load_percent ?? row.engine_load ?? 0).toFixed(0)}%</td>
                    <td>{Number(row.exhaust_temperature_c ?? row.exhaust_temperature ?? 0).toFixed(1)}</td>
                    <td>{Number((row.failure_probability ?? 0) * 100).toFixed(1)}%</td>
                    <td>
                      <span className={`status-tag ${(row.engine_condition || "normal").toLowerCase().replace(" ", "-")}`}>
                        {row.engine_condition || "Normal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-notice">No telemetry received yet. Click an injection button above to test.</div>
        )}
      </div>
    </div>
  );
}

export default TelemetrySimulatorPage;
