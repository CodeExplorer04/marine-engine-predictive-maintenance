import React, { useState, useEffect } from "react";
import { getRemediationActions, updateRemediationStatus, createRemediationAction } from "../services/api";

function AutomatedRemediationPage({ engineId }) {
  const [actions, setActions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const [newActionPriority, setNewActionPriority] = useState("High");
  const [newActionEngine, setNewActionEngine] = useState(engineId || "ENGINE-001");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadActions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getRemediationActions({
        engine_id: "all",
        status: filterStatus,
      });
      setActions(res.actions || []);
    } catch (err) {
      setError(err.message || "Failed to load automated remediation actions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [filterStatus]);

  const handleStatusChange = async (actionId, newStatus) => {
    try {
      setActionLoading(actionId);
      await updateRemediationStatus(actionId, newStatus, "Status updated by marine duty officer");
      setMessage(`Work order status updated to ${newStatus}.`);
      await loadActions();
    } catch (err) {
      setError(err.message || "Failed to update action status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCustom = async (e) => {
    e.preventDefault();
    try {
      await createRemediationAction({
        engine_id: newActionEngine,
        action: newActionText,
        priority: newActionPriority,
        category: "Preventive Dispatch",
        safety_advisory: "Adhere to Chief Engineer standard watchstanding instructions.",
        assigned_to: "Duty Marine Engineer",
        estimated_duration_hours: 2.0,
      });
      setShowModal(false);
      setNewActionText("");
      setMessage("New corrective work order queued.");
      await loadActions();
    } catch (err) {
      setError(err.message || "Failed to create work order.");
    }
  };

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">WORKFLOW AUTOMATION & ENGINEERING DISPATCH</span>
          <h2>Automated Remediation & Maintenance Actions</h2>
          <p>
            Corrective procedural recommendations generated automatically from anomaly detection and predictive failure models.
          </p>
        </div>
        <div className="header-actions">
          <button className="action-btn secondary" onClick={() => setShowModal(true)}>
            + Dispatch Work Order
          </button>
          <button className="action-btn primary" onClick={loadActions}>
            ↻ Refresh Workflow
          </button>
        </div>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      {/* FILTER TABS */}
      <div className="panel filter-panel">
        <div className="filter-group">
          <label>Workflow Status Filter:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="Pending">Pending (Unassigned/Queued)</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed / Closed</option>
          </select>
        </div>
      </div>

      {/* ACTION WORKFLOW LIST */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Corrective Maintenance Tasks</h3>
          <span className="badge-pill">{actions.length} Tasks Tracked</span>
        </div>

        {actions.length > 0 ? (
          <div className="remediation-grid">
            {actions.map((act) => {
              const actId = act.action_id || act._id;
              const isCompleted = act.status === "Completed";
              const isInProg = act.status === "In Progress";

              return (
                <div key={actId} className={`remediation-card ${act.priority?.toLowerCase()}`}>
                  <div className="rem-card-header">
                    <div className="rem-title-block">
                      <span className={`priority-badge ${act.priority?.toLowerCase()}`}>
                        {act.priority}
                      </span>
                      <strong>{act.engine_id}</strong>
                      <span className="rem-category">{act.category}</span>
                    </div>
                    <span className={`status-pill ${act.status?.toLowerCase().replace(" ", "-")}`}>
                      {act.status}
                    </span>
                  </div>

                  <h4 className="rem-action-title">{act.action}</h4>

                  <div className="rem-metadata-grid">
                    <div>
                      <span>Trigger:</span>
                      <strong>{act.trigger_parameter || "Risk Engine"}</strong>
                    </div>
                    <div>
                      <span>Observed:</span>
                      <strong>{act.observed_value || "High Risk Matrix"}</strong>
                    </div>
                    <div>
                      <span>Est. Duration:</span>
                      <strong>{act.estimated_duration_hours || 2.5} hrs</strong>
                    </div>
                    <div>
                      <span>Assigned To:</span>
                      <strong>{act.assigned_to || "Duty Engineer"}</strong>
                    </div>
                  </div>

                  <div className="rem-safety-box">
                    <strong>Safety Advisory:</strong> {act.safety_advisory}
                  </div>

                  <div className="rem-footer-actions">
                    <div className="rem-time">
                      Logged: {new Date(act.created_at).toLocaleDateString()}
                    </div>
                    <div className="btn-group">
                      {act.status === "Pending" && (
                        <button
                          className="table-action-btn"
                          disabled={actionLoading === actId}
                          onClick={() => handleStatusChange(actId, "In Progress")}
                        >
                          Start Work
                        </button>
                      )}
                      {!isCompleted && (
                        <button
                          className="table-action-btn resolve"
                          disabled={actionLoading === actId}
                          onClick={() => handleStatusChange(actId, "Completed")}
                        >
                          Mark Completed
                        </button>
                      )}
                      {isCompleted && (
                        <span className="resolved-check">✓ Maintenance Signed Off</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-notice">
            ✓ No corrective actions matching current criteria. All monitored systems operating within nominal limits.
          </div>
        )}
      </div>

      {/* DISPATCH MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Dispatch Manual Maintenance Order</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustom}>
              <div className="form-group">
                <label>Engine Unit</label>
                <select value={newActionEngine} onChange={(e) => setNewActionEngine(e.target.value)}>
                  <option value="ENGINE-001">ENGINE-001 (Port Main)</option>
                  <option value="ENGINE-002">ENGINE-002 (Starboard Main)</option>
                  <option value="ENGINE-003">ENGINE-003 (Aux Gen 1)</option>
                  <option value="ENGINE-004">ENGINE-004 (Emergency Diesel)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select value={newActionPriority} onChange={(e) => setNewActionPriority(e.target.value)}>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Routine">Routine</option>
                </select>
              </div>

              <div className="form-group">
                <label>Corrective Maintenance Procedure</label>
                <textarea
                  rows="3"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  placeholder="e.g., Clean sea-chest duplex strainer and inspect thermostatic mixing valve..."
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary">
                  Queue Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomatedRemediationPage;
