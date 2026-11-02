import React, { useState, useEffect } from "react";
import { getAlerts, acknowledgeAlert, resolveAlert, getAlertsStats } from "../services/api";

function SmartAlertsPage({ engineId, onAlertsUpdated }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterEngine, setFilterEngine] = useState(engineId || "all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAlerts({
        engine_id: filterEngine,
        severity: filterSeverity,
        status: filterStatus,
      });
      setAlerts(res.alerts || []);
      setStats(res.statistics || null);
      if (onAlertsUpdated) {
        onAlertsUpdated(res.statistics?.active || 0);
      }
    } catch (err) {
      setError(err.message || "Failed to retrieve smart alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterEngine, filterSeverity, filterStatus]);

  const handleAcknowledge = async (id) => {
    try {
      setActionLoading(id);
      await acknowledgeAlert(id);
      setMessage(`Alert acknowledged by watchkeeper.`);
      await loadAlerts();
    } catch (err) {
      setError(err.message || "Failed to acknowledge alert.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id) => {
    try {
      setActionLoading(id);
      await resolveAlert(id);
      setMessage(`Alert marked as resolved.`);
      await loadAlerts();
    } catch (err) {
      setError(err.message || "Failed to resolve alert.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">WATCHKEEPING & ALARM DISPATCH</span>
          <h2>Smart Alerts & Fleet Notifications</h2>
          <p>
            Real-time event notification pipeline triggered by ML degradation predictions and statutory safety threshold violations.
          </p>
        </div>
        <button className="action-btn secondary" onClick={loadAlerts}>
          ↻ Refresh Alerts
        </button>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      {/* ALERT STATS BAR */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Active / Unresolved</div>
          <div className="stat-val" style={{ color: stats?.active > 0 ? "#ff4d6d" : "#38ef7d" }}>
            {stats?.active || 0}
          </div>
          <small>Requiring watchkeeper review</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Critical Severity</div>
          <div className="stat-val" style={{ color: "#ff4d6d" }}>
            {stats?.critical || 0}
          </div>
          <small>Immediate inspection trip</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Warning Severity</div>
          <div className="stat-val" style={{ color: "#ffd166" }}>
            {stats?.warning || 0}
          </div>
          <small>Degradation trend warning</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">Resolved History</div>
          <div className="stat-val" style={{ color: "#38ef7d" }}>
            {stats?.resolved || 0}
          </div>
          <small>Documented remediations</small>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="panel filter-panel">
        <div className="filter-group">
          <label>Engine Filter:</label>
          <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)}>
            <option value="all">All Engines</option>
            <option value="ENGINE-001">ENGINE-001</option>
            <option value="ENGINE-002">ENGINE-002</option>
            <option value="ENGINE-003">ENGINE-003</option>
            <option value="ENGINE-004">ENGINE-004</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Severity:</label>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* ALERTS FEED */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Alert Feed & Event History</h3>
          <span className="badge-pill">{alerts.length} Displayed</span>
        </div>

        {alerts.length > 0 ? (
          <div className="alerts-list">
            {alerts.map((a) => {
              const aId = a.alert_id || a._id;
              const isResolved = a.status === "resolved";
              const isAck = a.acknowledged || a.status === "acknowledged";

              return (
                <div key={aId} className={`alert-item-card ${a.severity?.toLowerCase()} ${isResolved ? "resolved" : ""}`}>
                  <div className="alert-item-header">
                    <div className="alert-meta-left">
                      <span className={`status-tag ${a.severity?.toLowerCase()}`}>
                        {a.severity?.toUpperCase()}
                      </span>
                      <strong>{a.engine_id}</strong>
                      <span className="alert-type-pill">{a.alert_type}</span>
                    </div>
                    <div className="alert-time">
                      {new Date(a.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="alert-message">
                    {a.message}
                  </div>

                  <div className="alert-actions-bar">
                    <div className="alert-status-text">
                      Status: <strong>{a.status || (a.acknowledged ? "acknowledged" : "active")}</strong>
                    </div>
                    <div className="btn-group">
                      {!isAck && !isResolved && (
                        <button
                          className="table-action-btn"
                          disabled={actionLoading === aId}
                          onClick={() => handleAcknowledge(aId)}
                        >
                          Acknowledge
                        </button>
                      )}
                      {!isResolved && (
                        <button
                          className="table-action-btn resolve"
                          disabled={actionLoading === aId}
                          onClick={() => handleResolve(aId)}
                        >
                          Resolve Alert
                        </button>
                      )}
                      {isResolved && (
                        <span className="resolved-check">✓ Resolved</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-notice">
            ✓ No alerts matching the selected filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartAlertsPage;
