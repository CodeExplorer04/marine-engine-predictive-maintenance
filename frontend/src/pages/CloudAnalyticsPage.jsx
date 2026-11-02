import React, { useState, useEffect } from "react";
import { getFleetStats, getEngineAnalytics } from "../services/api";

function CloudAnalyticsPage({ engineId }) {
  const [filterEngine, setFilterEngine] = useState(engineId || "all");
  const [fleetStats, setFleetStats] = useState(null);
  const [engineAnalytics, setEngineAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const fRes = await getFleetStats({ engine_id: filterEngine });
      setFleetStats(fRes);

      if (filterEngine !== "all") {
        const eRes = await getEngineAnalytics(filterEngine, 50);
        setEngineAnalytics(eRes);
      } else {
        setEngineAnalytics(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load cloud analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filterEngine]);

  const params = fleetStats?.parameters || {};
  const condDist = fleetStats?.condition_distribution || { Normal: 0, Warning: 0, "High Risk": 0 };
  const totalRecords = fleetStats?.total_records || 0;

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">CLOUD ANALYTICS & FLEET TELEMETRY</span>
          <h2>Cloud Data Analytics & Aggregated Metrics</h2>
          <p>
            Statistical distribution, variance, peak deviations, and multi-sensor operational envelope across all vessel propulsion systems.
          </p>
        </div>
        <div className="filter-group">
          <label>Engine Scope:</label>
          <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)}>
            <option value="all">Entire Fleet (Aggregated)</option>
            <option value="ENGINE-001">ENGINE-001 (Port Main)</option>
            <option value="ENGINE-002">ENGINE-002 (Starboard Main)</option>
            <option value="ENGINE-003">ENGINE-003 (Aux Generator 1)</option>
            <option value="ENGINE-004">ENGINE-004 (Emergency Diesel)</option>
          </select>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* CONDITION DISTRIBUTION */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Operational Condition Distribution</h3>
          <span className="badge-pill">{totalRecords} Ingested Samples</span>
        </div>

        <div className="distribution-bar-wrapper">
          <div className="dist-segment normal" style={{ flex: condDist.Normal || 1 }}>
            <span>Normal ({condDist.Normal || 0})</span>
          </div>
          <div className="dist-segment warning" style={{ flex: condDist.Warning || 1 }}>
            <span>Warning ({condDist.Warning || 0})</span>
          </div>
          <div className="dist-segment high-risk" style={{ flex: condDist["High Risk"] || 1 }}>
            <span>High Risk ({condDist["High Risk"] || 0})</span>
          </div>
        </div>

        <div className="distribution-legend">
          <div className="legend-item"><span className="legend-dot normal" /> Normal Operational State</div>
          <div className="legend-item"><span className="legend-dot warning" /> Warning / Moderate Degradation</div>
          <div className="legend-item"><span className="legend-dot high-risk" /> High Risk Failure Trip</div>
        </div>
      </div>

      {/* SENSOR STATISTICAL AGGREGATIONS */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Statistical Sensor Metrics (Min, Mean, Max, Std Dev)</h3>
          <span className="badge-pill">Cloud Aggregation Engine</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Telemetry Parameter</th>
                <th>Minimum Observed</th>
                <th>Fleet Mean (Average)</th>
                <th>Maximum Observed</th>
                <th>Std Deviation (&sigma;)</th>
                <th>Signal Stability</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(params).map(([key, item]) => {
                const isVolatile = item.std > (item.avg * 0.25);
                return (
                  <tr key={key}>
                    <td><strong>{item.label}</strong></td>
                    <td>{item.min}</td>
                    <td><strong style={{ color: "#72c2ff" }}>{item.avg}</strong></td>
                    <td>{item.max}</td>
                    <td>&plusmn; {item.std}</td>
                    <td>
                      <span className={`status-tag ${isVolatile ? "warning" : "normal"}`}>
                        {isVolatile ? "Dynamic Variance" : "Nominal Stability"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT FAILURE PROBABILITY TIMELINE */}
      {fleetStats?.recent_series?.length > 0 && (
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Recent Telemetry Trend Timeline</h3>
            <span className="badge-pill">Latest 50 Ingestions</span>
          </div>

          <div className="timeline-grid">
            {fleetStats.recent_series.slice(0, 12).map((item, idx) => (
              <div key={idx} className="timeline-card">
                <div className="tl-head">
                  <strong>{item.engine_id}</strong>
                  <small>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}</small>
                </div>
                <div className="tl-stat">
                  <span>Risk:</span>
                  <strong style={{ color: item.failure_probability > 0.6 ? "#ff4d6d" : "#38ef7d" }}>
                    {(item.failure_probability * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="tl-details">
                  Vib: {item.vibration} mm/s &bull; Temp: {item.temperature}°C &bull; Oil: {item.oil_pressure} bar
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CloudAnalyticsPage;
