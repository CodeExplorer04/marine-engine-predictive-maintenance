import React, { useState, useEffect } from "react";
import { generateReport, getExportCsvUrl } from "../services/api";

function ReportsExportPage({ engineId }) {
  const [filterEngine, setFilterEngine] = useState(engineId || "all");
  const [reportType, setReportType] = useState("health_summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await generateReport({
        engine_id: filterEngine,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        report_type: reportType,
      });
      setReport(res);
    } catch (err) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [filterEngine, reportType]);

  const stats = report?.summary_statistics || {};

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">AUDIT, COMPLIANCE & EXPORT</span>
          <h2>Vessel Machinery Reports & CSV Data Export</h2>
          <p>
            Generate comprehensive health audits from verified MongoDB sensor records, alerts, and corrective remediation tasks.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* FILTER & CONFIGURATION PANEL */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Report Parameters & Date Range Filter</h3>
          <span className="badge-pill">IMO Audit Standard</span>
        </div>

        <form onSubmit={handleGenerate} className="report-filter-grid">
          <div className="form-group">
            <label>Machinery Unit:</label>
            <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)}>
              <option value="all">Fleet-Wide Consolidated</option>
              <option value="ENGINE-001">ENGINE-001 (Port Main)</option>
              <option value="ENGINE-002">ENGINE-002 (Starboard Main)</option>
              <option value="ENGINE-003">ENGINE-003 (Aux Generator 1)</option>
              <option value="ENGINE-004">ENGINE-004 (Emergency Diesel)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Report Audit Type:</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="health_summary">Engine Health Summary</option>
              <option value="incident_audit">Alert & Anomaly Incident Audit</option>
              <option value="maintenance_log">Predictive Maintenance Compliance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Start Date / Time:</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>End Date / Time:</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="form-group btn-col">
            <label>&nbsp;</label>
            <button type="submit" className="action-btn primary" disabled={loading}>
              {loading ? "Compiling..." : "Generate Preview"}
            </button>
          </div>
        </form>
      </div>

      {/* CSV EXPORT DOWNLOAD BUTTONS */}
      <div className="panel export-action-panel">
        <div className="panel-title-bar">
          <h3>Export Verified Records to CSV</h3>
          <span className="badge-pill">Direct File Download</span>
        </div>

        <p className="small-desc">
          Download authenticated dataset records for regulatory submission, classification society audits, and statistical reporting.
        </p>

        <div className="export-btn-group">
          <a
            className="action-btn secondary export-btn"
            href={getExportCsvUrl({ engine_id: filterEngine, data_type: "sensors" })}
            download
            target="_blank"
            rel="noreferrer"
          >
            📥 Export Telemetry CSV ({stats.total_telemetry_records || 0} records)
          </a>

          <a
            className="action-btn secondary export-btn"
            href={getExportCsvUrl({ engine_id: filterEngine, data_type: "alerts" })}
            download
            target="_blank"
            rel="noreferrer"
          >
            📥 Export Smart Alerts CSV ({stats.total_alerts_recorded || 0} records)
          </a>

          <a
            className="action-btn secondary export-btn"
            href={getExportCsvUrl({ engine_id: filterEngine, data_type: "remediation" })}
            download
            target="_blank"
            rel="noreferrer"
          >
            📥 Export Remediation Tasks CSV ({stats.remediation_actions_count || 0} records)
          </a>
        </div>
      </div>

      {/* REPORT PREVIEW */}
      {report && (
        <div className="panel report-preview-paper">
          <div className="paper-header">
            <div>
              <span className="paper-eyebrow">OFFICIAL VESSEL HEALTH CERTIFICATION</span>
              <h2>{report.report_id}</h2>
              <small>Generated: {new Date(report.generated_at).toUTCString()}</small>
            </div>
            <div className="paper-seal">
              <span>APPROVED</span>
            </div>
          </div>

          <div className="paper-kpi-grid">
            <div className="kpi-cell">
              <span>Scope</span>
              <strong>{report.engine_filter}</strong>
            </div>
            <div className="kpi-cell">
              <span>Telemetry Ingested</span>
              <strong>{stats.total_telemetry_records}</strong>
            </div>
            <div className="kpi-cell">
              <span>Total Alarms</span>
              <strong>{stats.total_alerts_recorded}</strong>
            </div>
            <div className="kpi-cell">
              <span>Mean Temp</span>
              <strong>{stats.average_temperature_c} °C</strong>
            </div>
            <div className="kpi-cell">
              <span>Mean Vibration</span>
              <strong>{stats.average_vibration_mm_s} mm/s</strong>
            </div>
            <div className="kpi-cell">
              <span>Peak Vibration</span>
              <strong style={{ color: stats.peak_vibration_mm_s > 4.5 ? "#ff4d6d" : "#e7eef6" }}>
                {stats.peak_vibration_mm_s} mm/s
              </strong>
            </div>
          </div>

          <div className="paper-section">
            <h4>Sample Telemetry Audit Stream</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Engine</th>
                    <th>RPM</th>
                    <th>Temp (°C)</th>
                    <th>Oil (bar)</th>
                    <th>Vib (mm/s)</th>
                    <th>Risk</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recent_readings?.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td>{r.engine_id}</td>
                      <td>{Number(r.rpm ?? r.engine_rpm ?? 0).toFixed(0)}</td>
                      <td>{Number(r.engine_temperature_c ?? r.engine_temperature ?? 0).toFixed(1)}</td>
                      <td>{Number(r.oil_pressure_bar ?? r.oil_pressure ?? 0).toFixed(2)}</td>
                      <td>{Number(r.vibration_mm_s ?? r.vibration ?? 0).toFixed(2)}</td>
                      <td>{(Number(r.failure_probability ?? 0) * 100).toFixed(1)}%</td>
                      <td>
                        <span className={`status-tag ${(r.engine_condition || "normal").toLowerCase()}`}>
                          {r.engine_condition || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsExportPage;
