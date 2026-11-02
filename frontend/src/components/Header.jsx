import React from "react";

function Header({
  engineId,
  setEngineId,
  refresh,
  loading,
  alertCount = 0,
  onNavigate,
  onSimulate,
  currentUser = { name: "Capt. Vance", role: "Administrator" }
}) {
  return (
    <header className="header">
      <div>
        <div className="eyebrow">CLOUD-BASED MARINE ENGINE PREDICTIVE MAINTENANCE</div>
        <h1>Fleet Health & Telemetry Center</h1>
      </div>

      <div className="header-actions">
        <div className="engine-selector">
          <span>ENGINE</span>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value)}
          >
            <option value="ENGINE-001">ENGINE-001 (Port Main)</option>
            <option value="ENGINE-002">ENGINE-002 (Starboard Main)</option>
            <option value="ENGINE-003">ENGINE-003 (Aux Generator 1)</option>
            <option value="ENGINE-004">ENGINE-004 (Emergency Diesel)</option>
          </select>
        </div>

        {onSimulate && (
          <button
            className="sim-quick-btn"
            title="Inject simulated sensor reading"
            onClick={() => onSimulate(engineId, "mixed")}
          >
            ⚡ Simulate Pulse
          </button>
        )}

        <button
          className="refresh-button"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? "↻ Syncing..." : "↻ Refresh"}
        </button>

        <button
          className="notification-indicator"
          onClick={() => onNavigate && onNavigate("alerts")}
          title={`${alertCount} Active Alerts`}
        >
          🔔
          {alertCount > 0 && <span className="notification-badge">{alertCount}</span>}
        </button>

        <div
          className="user-pill"
          onClick={() => onNavigate && onNavigate("security")}
          title="Account & Role"
        >
          <span className="user-avatar">⚓</span>
          <div className="user-info-text">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;