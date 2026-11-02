import React, { useState, useEffect } from "react";
import { getActiveThresholds, updateThresholds, resetThresholds } from "../services/api";

function ThresholdManagementPage() {
  const [thresholds, setThresholds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getActiveThresholds();
      setThresholds(res.thresholds || {});
    } catch (err) {
      setError(err.message || "Failed to fetch active sensor thresholds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFieldChange = (param, key, val) => {
    setThresholds((prev) => ({
      ...prev,
      [param]: {
        ...prev[param],
        [key]: Number(val),
      },
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await updateThresholds(thresholds, "Marine Chief Engineer");
      setMessage(res.message || "Dynamic thresholds updated successfully.");
      setThresholds(res.thresholds || thresholds);
    } catch (err) {
      setError(err.message || "Failed to save updated thresholds.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all sensor thresholds to factory marine baseline specifications?")) {
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await resetThresholds("Marine Chief Engineer");
      setMessage(res.message || "Thresholds restored to baseline.");
      setThresholds(res.thresholds || {});
    } catch (err) {
      setError(err.message || "Failed to reset thresholds.");
    } finally {
      setSaving(false);
    }
  };

  const parameterLabels = {
    engine_temperature_c: { name: "Engine Temperature", unit: "°C", desc: "Monitored cylinder block thermal threshold." },
    oil_pressure_bar: { name: "Oil Pressure", unit: "bar", desc: "Main lubrication circuit minimum operating pressure." },
    vibration_mm_s: { name: "Vibration Amplitude", unit: "mm/s", desc: "Rotational and structural oscillation severity." },
    rpm: { name: "Engine Speed (RPM)", unit: "RPM", desc: "Main crankshaft governor upper rotational limit." },
    exhaust_temperature_c: { name: "Exhaust Temperature", unit: "°C", desc: "Cylinder combustion exhaust gas pyrometer limit." },
    engine_load_percent: { name: "Engine Load", unit: "%", desc: "MCR percentage load limit." },
    fuel_consumption_l_hr: { name: "Fuel Consumption", unit: "L/hr", desc: "Volumetric fuel consumption flow rate limit." },
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">SAFETY LIMITS & COMPLIANCE</span>
          <h2>Dynamic Sensor Threshold Management</h2>
          <p>
            Configure operational safety trip limits. Changes persist in MongoDB and apply immediately to live anomaly detection without backend restart.
          </p>
        </div>
        <div className="header-actions">
          <button className="action-btn secondary" onClick={handleReset} disabled={saving}>
            ↺ Reset to Marine Baseline
          </button>
          <button className="action-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving Changes..." : "💾 Save Changes to MongoDB"}
          </button>
        </div>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      <form onSubmit={handleSave}>
        <div className="thresholds-grid">
          {Object.entries(thresholds).map(([paramKey, limits]) => {
            const meta = parameterLabels[paramKey] || { name: paramKey, unit: "", desc: "" };
            const isMinBased = "warning_min" in limits;

            return (
              <div key={paramKey} className="threshold-card">
                <div className="th-card-header">
                  <div>
                    <strong>{meta.name}</strong>
                    <span className="unit-tag">({meta.unit || limits.unit})</span>
                  </div>
                  <span className="badge-pill">IMO Standard</span>
                </div>
                <p className="th-desc">{meta.desc}</p>

                <div className="th-inputs-grid">
                  {isMinBased ? (
                    <>
                      <div className="th-input-box">
                        <label>Warning Minimum ({meta.unit})</label>
                        <input
                          type="number"
                          step="0.1"
                          value={limits.warning_min ?? 3.0}
                          onChange={(e) => handleFieldChange(paramKey, "warning_min", e.target.value)}
                          required
                        />
                      </div>
                      <div className="th-input-box critical-box">
                        <label>Critical Minimum ({meta.unit})</label>
                        <input
                          type="number"
                          step="0.1"
                          value={limits.critical_min ?? 2.2}
                          onChange={(e) => handleFieldChange(paramKey, "critical_min", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="th-input-box">
                        <label>Warning Limit ({meta.unit})</label>
                        <input
                          type="number"
                          step="0.1"
                          value={limits.warning ?? 95.0}
                          onChange={(e) => handleFieldChange(paramKey, "warning", e.target.value)}
                          required
                        />
                      </div>
                      <div className="th-input-box critical-box">
                        <label>Critical Limit ({meta.unit})</label>
                        <input
                          type="number"
                          step="0.1"
                          value={limits.critical ?? 110.0}
                          onChange={(e) => handleFieldChange(paramKey, "critical", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="th-limits-note">
                  Permissible Safe Range: {limits.min_limit ?? 0} &ndash; {limits.max_limit ?? 100} {meta.unit}
                </div>
              </div>
            );
          })}
        </div>

        <div className="form-submit-footer">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Applying Threshold Updates..." : "Save and Apply Updated Thresholds"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ThresholdManagementPage;
