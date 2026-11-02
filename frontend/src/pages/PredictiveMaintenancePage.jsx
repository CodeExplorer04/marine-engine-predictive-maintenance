import React, { useState, useEffect } from "react";
import { getMaintenanceOverview, getMaintenanceRecommendations } from "../services/api";

function PredictiveMaintenancePage({ engineId, setEngineId }) {
  const [overview, setOverview] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (targetEngine) => {
    try {
      setLoading(true);
      const ovRes = await getMaintenanceOverview();
      setOverview(ovRes);

      const recRes = await getMaintenanceRecommendations(targetEngine || engineId);
      setRecommendations(recRes);
    } catch (err) {
      setError(err.message || "Failed to load predictive maintenance recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(engineId);
  }, [engineId]);

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">CONDITION-BASED MAINTENANCE</span>
          <h2>Predictive Maintenance & Component Health</h2>
          <p>
            Automated degradation assessment across critical mechanical sub-assemblies based on multi-sensor telemetry and ML failure probability.
          </p>
        </div>
        <button className="action-btn secondary" onClick={() => loadData(engineId)}>
          ↻ Refresh Maintenance Schedule
        </button>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* PRIORITY SUMMARY STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Urgent Overhauls</div>
          <div className="stat-val" style={{ color: "#ff4d6d" }}>
            {overview?.priority_summary?.Urgent || 0}
          </div>
          <small>Failure Risk &ge; 70%</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">High Priority Inspections</div>
          <div className="stat-val" style={{ color: "#ffd166" }}>
            {overview?.priority_summary?.High || 0}
          </div>
          <small>Failure Risk 40% – 69%</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Medium Attention</div>
          <div className="stat-val" style={{ color: "#72c2ff" }}>
            {overview?.priority_summary?.Medium || 0}
          </div>
          <small>Failure Risk 20% – 39%</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Routine Watchkeeping</div>
          <div className="stat-val" style={{ color: "#38ef7d" }}>
            {overview?.priority_summary?.Routine || 0}
          </div>
          <small>Healthy Baseline</small>
        </div>
      </div>

      {/* FLEET RISK RANKING */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Fleet Engine Risk Priority Ranking</h3>
          <span className="badge-pill">{overview?.total_monitored || 4} Vessels/Units</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Engine ID</th>
                <th>Failure Risk</th>
                <th>Health Score</th>
                <th>Maintenance Priority</th>
                <th>Action Window</th>
                <th>Switch View</th>
              </tr>
            </thead>
            <tbody>
              {overview?.ranked_engines?.map((eng) => (
                <tr key={eng.engine_id} className={eng.engine_id === engineId ? "selected-row" : ""}>
                  <td><strong>{eng.engine_id}</strong></td>
                  <td>{(eng.failure_probability * 100).toFixed(1)}%</td>
                  <td>{eng.health_score}/100</td>
                  <td>
                    <span className={`status-tag ${eng.maintenance_priority?.toLowerCase()}`}>
                      {eng.maintenance_priority}
                    </span>
                  </td>
                  <td>
                    {eng.maintenance_priority === "Urgent" ? "Within 24 Hours" : eng.maintenance_priority === "High" ? "Within 72 Hours" : "Next Planned Window"}
                  </td>
                  <td>
                    <button
                      className="table-action-btn"
                      onClick={() => setEngineId && setEngineId(eng.engine_id)}
                    >
                      Inspect {eng.engine_id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPONENT HEALTH BREAKDOWN FOR SELECTED ENGINE */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Component-Level Health Degradation ({engineId})</h3>
          <span className="badge-pill">Target Machinery</span>
        </div>

        <div className="component-grid">
          {recommendations?.components?.map((c, i) => (
            <div key={i} className={`component-card ${c.status.toLowerCase()}`}>
              <div className="comp-header">
                <strong>{c.component}</strong>
                <span className={`status-tag ${c.status.toLowerCase()}`}>{c.status}</span>
              </div>
              <div className="comp-body">
                <div className="comp-metric-row">
                  <span>Monitored Parameter:</span>
                  <code>{c.sensor}</code>
                </div>
                <div className="comp-metric-row">
                  <span>Current Reading:</span>
                  <strong>{c.current_value}</strong>
                </div>
                <div className="comp-metric-row">
                  <span>Component Integrity:</span>
                  <strong>{c.health_score}%</strong>
                </div>
                <div className="comp-rec-text">
                  <em>Action:</em> {c.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECOMMENDED INSPECTION ACTION ITEMS */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Preventive Inspection Protocol & Technical Rationale</h3>
          <span className="badge-pill">Safety Standard: IMO STCW</span>
        </div>

        <div className="action-items-list">
          {recommendations?.action_items?.map((item, idx) => (
            <div key={idx} className="action-card">
              <div className="action-header">
                <span className={`priority-badge ${item.priority.toLowerCase()}`}>
                  {item.priority} Priority
                </span>
                <strong>{item.action}</strong>
                <span className="window-pill">{item.estimated_interval}</span>
              </div>
              <p className="action-rationale">
                <strong>Technical Rationale:</strong> {item.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PredictiveMaintenancePage;
