import React, { useState, useEffect } from "react";
import { detectAnomalies, getAnomalyHistory, getAnomalyStats } from "../services/api";

function AnomalyDetectionPage({ engineId, sensor }) {
  const [currentAnomaly, setCurrentAnomaly] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runDetection = async () => {
    if (!sensor) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        engine_id: engineId,
        operating_hours: Number(sensor.operating_hours ?? 8000),
        engine_load_percent: Number(sensor.engine_load_percent ?? sensor.engine_load ?? 60),
        engine_temperature_c: Number(sensor.engine_temperature_c ?? sensor.engine_temperature ?? 85),
        oil_pressure_bar: Number(sensor.oil_pressure_bar ?? sensor.oil_pressure ?? 4.0),
        rpm: Number(sensor.rpm ?? sensor.engine_rpm ?? 1450),
        exhaust_temperature_c: Number(sensor.exhaust_temperature_c ?? sensor.exhaust_temperature ?? 360),
        vibration_mm_s: Number(sensor.vibration_mm_s ?? sensor.vibration ?? 2.1),
        fuel_consumption_l_hr: Number(sensor.fuel_consumption_l_hr ?? sensor.fuel_consumption ?? 210),
      };

      const res = await detectAnomalies(payload);
      setCurrentAnomaly(res);

      const histRes = await getAnomalyHistory(engineId, 30);
      setHistory(histRes.anomalies || []);

      const statsRes = await getAnomalyStats();
      setStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to execute anomaly detection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDetection();
  }, [engineId, sensor]);

  const isAnomaly = currentAnomaly?.is_anomaly;
  const isoScore = currentAnomaly?.isolation_forest_score ?? 0;

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">UNSUPERVISED & THRESHOLD ANOMALY DETECTION</span>
          <h2>Multivariate Engine Anomaly Detection</h2>
          <p>
            Real-time anomaly identification pairing Scikit-learn Isolation Forest with active IMO marine safety limits.
          </p>
        </div>
        <button className="action-btn primary" onClick={runDetection} disabled={loading}>
          {loading ? "Analyzing Sensors..." : "⚡ Scan Current Telemetry"}
        </button>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* TOP ANOMALY STATUS CARDS */}
      <div className="stats-grid">
        <div className={`stat-card ${isAnomaly ? "warning-card" : "normal-card"}`}>
          <div className="stat-title">Anomaly Status</div>
          <div className="stat-val" style={{ color: isAnomaly ? "#ff4d6d" : "#38ef7d" }}>
            {isAnomaly ? "Anomaly Flagged" : "Normal Baseline"}
          </div>
          <small>{currentAnomaly?.severity?.toUpperCase() || "SAFE"}</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Isolation Forest Score</div>
          <div className="stat-val">
            {isoScore > 0 ? `+${isoScore}` : isoScore}
          </div>
          <small>{isoScore < 0 ? "Below decision threshold (Outlier)" : "Inlier normal region"}</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Threshold Violations</div>
          <div className="stat-val" style={{ color: currentAnomaly?.abnormal_parameters?.length ? "#ff9f1c" : "#e7eef6" }}>
            {currentAnomaly?.abnormal_parameters?.length || 0}
          </div>
          <small>Active parameter alerts</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Total Fleet Anomalies</div>
          <div className="stat-val">
            {stats?.total_anomalies ?? history.length}
          </div>
          <small>{stats?.critical_count ?? 0} critical severity incidents</small>
        </div>
      </div>

      {/* ACTIVE DIAGNOSIS */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Real-Time Diagnostic Assessment</h3>
          <span className={`status-pill ${isAnomaly ? "critical" : "normal"}`}>
            {isAnomaly ? "ATTENTION REQUIRED" : "SAFE OPERATION"}
          </span>
        </div>

        <p className="diagnosis-text">{currentAnomaly?.diagnosis || "Engine operational behavior conforms to baseline training signatures."}</p>

        {currentAnomaly?.abnormal_parameters?.length > 0 ? (
          <div className="violation-grid">
            {currentAnomaly.abnormal_parameters.map((p, idx) => (
              <div key={idx} className={`violation-card ${p.severity}`}>
                <div className="v-header">
                  <strong>{p.parameter}</strong>
                  <span className="v-badge">{p.severity.toUpperCase()}</span>
                </div>
                <div className="v-body">
                  <div>Observed: <strong>{p.value} {p.unit}</strong></div>
                  <div>Threshold: <strong>{p.threshold} {p.unit}</strong></div>
                  <div className="v-desc">{p.implication}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-notice">
            ✓ No sensor parameters currently breach active marine safety thresholds.
          </div>
        )}
      </div>

      {/* ANOMALY HISTORY TABLE */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Historical Anomaly Log ({engineId})</h3>
          <span className="badge-pill">{history.length} Incidents</span>
        </div>

        {history.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Engine</th>
                  <th>Severity</th>
                  <th>Isolation Forest</th>
                  <th>Abnormal Parameters</th>
                  <th>Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td><strong>{row.engine_id}</strong></td>
                    <td>
                      <span className={`status-tag ${row.severity}`}>
                        {row.severity}
                      </span>
                    </td>
                    <td>{row.isolation_forest_score}</td>
                    <td>{row.abnormal_parameters?.map((p) => p.parameter).join(", ") || "Multivariate Outlier"}</td>
                    <td className="truncate-cell">{row.diagnosis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-notice">No anomalies recorded for this engine yet.</div>
        )}
      </div>
    </div>
  );
}

export default AnomalyDetectionPage;
