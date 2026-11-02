import React from "react";
import StatCard from "../components/StatCard";
import SensorCard from "../components/SensorCard";
import HealthGauge from "../components/HealthGauge";
import RiskBadge from "../components/RiskBadge";
import SensorChart from "../components/SensorChart";

function Dashboard({
  sensor,
  prediction,
  history,
  engineId,
  onNavigate,
  onSimulate,
  fleetSummary,
}) {
  const failureProbability = Number(
    prediction?.failure_probability_percent ??
    prediction?.failure_percentage ??
    ((prediction?.failure_probability ?? 0) * 100)
  );

  const healthScore = Number(
    prediction?.engine_health_score ??
    prediction?.health_score ??
    85
  );

  const risk = prediction?.engine_condition || prediction?.risk_level || "Normal";

  const historyData = Array.isArray(history)
    ? [...history].reverse().slice(-20)
    : [];

  const labels = historyData.map((item) =>
    item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : ""
  );

  const temperatureData = historyData.map((item) =>
    Number(item.engine_temperature_c ?? item.engine_temperature ?? 0)
  );

  const vibrationData = historyData.map((item) =>
    Number(item.vibration_mm_s ?? item.vibration ?? 0)
  );

  const currentTemp = Number(sensor?.engine_temperature_c ?? sensor?.engine_temperature ?? 85);
  const currentOil = Number(sensor?.oil_pressure_bar ?? sensor?.oil_pressure ?? 4.2);
  const currentVib = Number(sensor?.vibration_mm_s ?? sensor?.vibration ?? 2.1);
  const currentRpm = Number(sensor?.rpm ?? sensor?.engine_rpm ?? 1450);
  const currentLoad = Number(sensor?.engine_load_percent ?? sensor?.engine_load ?? 60);
  const currentExhaust = Number(sensor?.exhaust_temperature_c ?? sensor?.exhaust_temperature ?? 360);
  const currentFuel = Number(sensor?.fuel_consumption_l_hr ?? sensor?.fuel_consumption ?? 210);
  const currentCoolant = Number(sensor?.coolant_temperature ?? currentTemp - 10);

  return (
    <>
      {/* QUICK SIMULATOR BANNER */}
      {onSimulate && (
        <div className="quick-sim-bar">
          <div className="sim-info">
            <strong>Demonstration Simulator Trigger:</strong>
            <span>Inject synthetic telemetry pulse for active unit ({engineId})</span>
          </div>
          <div className="sim-quick-actions">
            <button className="pill-btn sim-green" onClick={() => onSimulate(engineId, "normal")}>
              🟢 Normal
            </button>
            <button className="pill-btn sim-yellow" onClick={() => onSimulate(engineId, "warning")}>
              🟡 Warning
            </button>
            <button className="pill-btn sim-red" onClick={() => onSimulate(engineId, "high_risk")}>
              🔴 High Risk
            </button>
            <button className="pill-btn sim-blue" onClick={() => onSimulate(engineId, "mixed")}>
              🎲 Mixed Pulse
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="hero-grid">
        <div className="hero-card">
          <div className="hero-text">
            <span className="panel-label">ACTIVE VESSEL MACHINERY &bull; {engineId}</span>
            <h2>
              Engine Health
              <br />
              At A Glance
            </h2>
            <p>
              Real-time machine learning failure prediction, multivariate anomaly scoring, and dynamic IMO threshold compliance.
            </p>
            <div className="live-status">
              <span className="pulse"></span>
              FastAPI Telemetry Stream Active (MongoDB Ingestion)
            </div>
          </div>
          <HealthGauge score={healthScore} />
        </div>

        {/* FAILURE PREDICTION CARD */}
        <div className="prediction-card">
          <div className="prediction-header">
            <div>
              <span className="panel-label">ML RANDOM FOREST PREDICTION</span>
              <h3>Failure Probability</h3>
            </div>
            <RiskBadge level={risk} />
          </div>

          <div className="failure-number">
            {failureProbability.toFixed(1)}
            <small>%</small>
          </div>

          <div className="progress-bar">
            <div
              style={{
                width: `${Math.min(failureProbability, 100)}%`,
                backgroundColor: failureProbability < 35 ? "#38ef7d" : failureProbability < 70 ? "#ffd166" : "#ff4d6d",
              }}
            />
          </div>

          <p>
            {prediction?.maintenance_recommendation ||
              "Operating parameters within safe marine thresholds."}
          </p>

          <div className="card-quick-links">
            <button className="link-btn" onClick={() => onNavigate && onNavigate("prediction")}>
              Analyze Feature Inputs &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* FLEET KPI COUNTERS */}
      {fleetSummary && (
        <section className="fleet-summary-bar">
          <div className="fleet-chip">
            <span>Total Monitored Engines:</span>
            <strong>{fleetSummary.engines_monitored || 4}</strong>
          </div>
          <div className="fleet-chip">
            <span>Fleet Health Average:</span>
            <strong style={{ color: "#38ef7d" }}>{fleetSummary.fleet_health_score || 88}%</strong>
          </div>
          <div className="fleet-chip">
            <span>Normal:</span>
            <strong style={{ color: "#38ef7d" }}>{fleetSummary.condition_counts?.normal || 0}</strong>
          </div>
          <div className="fleet-chip">
            <span>Warning:</span>
            <strong style={{ color: "#ffd166" }}>{fleetSummary.condition_counts?.warning || 0}</strong>
          </div>
          <div className="fleet-chip">
            <span>High Risk:</span>
            <strong style={{ color: "#ff4d6d" }}>{fleetSummary.condition_counts?.high_risk || 0}</strong>
          </div>
          <div className="fleet-chip">
            <span>Active Alerts:</span>
            <strong style={{ color: "#ff9f1c" }}>{fleetSummary.alerts_summary?.active || 0}</strong>
          </div>
        </section>
      )}

      {/* PRIMARY STATS */}
      <section className="stats-grid">
        <StatCard
          title="Health Score"
          value={healthScore.toFixed(0)}
          unit="/100"
          icon="♥"
          status={risk}
        />
        <StatCard
          title="Failure Probability"
          value={failureProbability.toFixed(1)}
          unit="%"
          icon="◈"
          status={risk}
        />
        <StatCard
          title="Engine Load"
          value={currentLoad.toFixed(1)}
          unit="%"
          icon="◒"
        />
        <StatCard
          title="Engine Speed"
          value={currentRpm.toFixed(0)}
          unit="RPM"
          icon="↻"
        />
      </section>

      {/* SENSOR MONITORING */}
      <section>
        <div className="section-header">
          <div>
            <span className="panel-label">REAL-TIME VESSEL TELEMETRY</span>
            <h2>Active Sensor Parameters ({engineId})</h2>
          </div>
          <span className="live-badge">● LIVE STREAM</span>
        </div>

        <div className="sensor-grid">
          <SensorCard
            title="Engine Temperature"
            value={currentTemp.toFixed(1)}
            unit="°C"
            icon="T"
            warning={currentTemp >= 95}
          />
          <SensorCard
            title="Oil Pressure"
            value={currentOil.toFixed(2)}
            unit="bar"
            icon="O"
            warning={currentOil <= 3.0}
          />
          <SensorCard
            title="Vibration Amplitude"
            value={currentVib.toFixed(2)}
            unit="mm/s"
            icon="V"
            warning={currentVib >= 3.5}
          />
          <SensorCard
            title="Exhaust Temperature"
            value={currentExhaust.toFixed(1)}
            unit="°C"
            icon="E"
            warning={currentExhaust >= 440}
          />
          <SensorCard
            title="Fuel Consumption"
            value={currentFuel.toFixed(1)}
            unit="L/hr"
            icon="F"
          />
          <SensorCard
            title="Coolant Temperature"
            value={currentCoolant.toFixed(1)}
            unit="°C"
            icon="C"
          />
        </div>
      </section>

      {/* CHARTS */}
      <section className="charts-grid">
        <SensorChart
          title="Engine Temperature Trend"
          unit="°C"
          labels={labels.length ? labels : ["No data"]}
          values={temperatureData.length ? temperatureData : [0]}
        />
        <SensorChart
          title="Vibration Amplitude Trend"
          unit="mm/s"
          labels={labels.length ? labels : ["No data"]}
          values={vibrationData.length ? vibrationData : [0]}
        />
      </section>

      {/* BOTTOM ACTION / ALERTS PANELS */}
      <section className="bottom-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <span className="panel-label">PREDICTIVE MAINTENANCE</span>
              <h2>Recommended Action</h2>
            </div>
            <button className="table-action-btn" onClick={() => onNavigate && onNavigate("maintenance")}>
              View All Tasks &rarr;
            </button>
          </div>

          <div className="recommendation">
            <div className="recommendation-icon">✓</div>
            <div>
              <strong>
                {prediction?.maintenance_recommendation ||
                  "Continue routine watchkeeping and scheduled maintenance."}
              </strong>
              <p>
                Dynamic ML evaluation indicates{" "}
                {risk === "High Risk"
                  ? "immediate overhaul required due to thermal/vibrational instability."
                  : risk === "Warning"
                  ? "elevated operational wear. Pre-emptive inspection advised."
                  : "propulsion machinery operating within normal marine baseline."}
              </p>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <span className="panel-label">ALERT STATUS</span>
              <h2>Alert Center</h2>
            </div>
            <button className="table-action-btn" onClick={() => onNavigate && onNavigate("alerts")}>
              Manage Alerts &rarr;
            </button>
          </div>

          <div className={`alert-box ${risk === "High Risk" ? "critical" : risk === "Warning" ? "warning" : "normal"}`}>
            <strong>
              {risk === "High Risk"
                ? "Critical Risk Detected"
                : risk === "Warning"
                ? "Engine Degradation Detected"
                : "Engine Operating Normally"}
            </strong>
            <p>
              {risk === "High Risk"
                ? "Immediate inspection recommended. Automated remediation order created."
                : risk === "Warning"
                ? "Increase telemetry monitoring frequency and check lube oil filter differential."
                : "All monitored parameters are inside safe operating boundaries."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Dashboard;