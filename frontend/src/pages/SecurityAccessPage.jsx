import React, { useState, useEffect } from "react";
import { loginUser, getUsersList, createUser, setAuthToken } from "../services/api";

function SecurityAccessPage({ currentUser, setCurrentUser }) {
  const [users, setUsers] = useState([]);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("Fleet Operator");
  const [newDepartment, setNewDepartment] = useState("Engineering Watch");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await getUsersList();
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || "Failed to load system users.");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await loginUser(loginUsername, loginPassword);
      setAuthToken(res.access_token);
      if (setCurrentUser) {
        setCurrentUser({
          name: res.user.full_name,
          role: res.user.role,
          username: res.user.username,
          department: res.user.department,
          permissions: res.user.permissions,
        });
      }
      setMessage(`Authenticated successfully as ${res.user.full_name} (${res.user.role}).`);
      setLoginUsername("");
      setLoginPassword("");
    } catch (err) {
      setError(err.message || "Invalid authentication credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    if (setCurrentUser) {
      setCurrentUser({
        name: "Guest Operator",
        role: "Guest",
        username: "guest",
        department: "General",
        permissions: ["dashboard:read"],
      });
    }
    setMessage("Session terminated. Signed out successfully.");
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await createUser({
        username: newUsername,
        password: newPassword,
        full_name: newFullName,
        role: newRole,
        department: newDepartment,
        email: newEmail,
      });
      setMessage(res.message || "User account created successfully.");
      setShowAddUserModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewEmail("");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Failed to create user account.");
    }
  };

  const rbacMatrix = [
    { role: "Administrator", desc: "Full root access across telemetry, dynamic threshold override, user provision, and ML benchmarking.", badge: "Full Access" },
    { role: "Chief Engineer", desc: "Machinery operational authority, threshold tuning, maintenance work order dispatch, and alert resolution.", badge: "Engineering Lead" },
    { role: "Fleet Operator", desc: "Continuous live telemetry monitoring, alarm acknowledgment, and single-pulse simulator execution.", badge: "Operational Watch" },
    { role: "Safety Auditor", desc: "Read-only compliance verification, anomaly history inspection, and regulatory CSV export.", badge: "Audit & Compliance" },
  ];

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">CYBERSECURITY, IDENTITY & RBAC</span>
          <h2>Cloud Security & Access Control</h2>
          <p>
            Role-Based Access Control (RBAC), bcrypt salted password hashing, JWT cryptographic session validation, and Azure secret protection.
          </p>
        </div>
        <div>
          {currentUser?.role !== "Guest" ? (
            <button className="action-btn secondary" onClick={handleLogout}>
              🚪 Sign Out ({currentUser?.name})
            </button>
          ) : null}
        </div>
      </div>

      {message && <div className="success-banner">✓ {message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="grid-2-col">
        {/* ACTIVE SESSION CARD */}
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Active Security Principal</h3>
            <span className="badge-pill">JWT Authenticated</span>
          </div>

          <div className="user-profile-card">
            <div className="user-avatar-large">⚓</div>
            <div>
              <h3>{currentUser?.name || "Captain David Vance"}</h3>
              <p>Role: <strong>{currentUser?.role || "Administrator"}</strong></p>
              <small>Department: {currentUser?.department || "Fleet Engineering Command"}</small>
            </div>
          </div>

          <div className="permissions-summary">
            <h4>Granted Security Privileges</h4>
            <div className="permission-tags">
              {currentUser?.permissions?.map((p, i) => (
                <span key={i} className="perm-tag">✓ {p}</span>
              )) || (
                <>
                  <span className="perm-tag">✓ telemetry:read/write</span>
                  <span className="perm-tag">✓ ml_predict:execute</span>
                  <span className="perm-tag">✓ thresholds:override</span>
                  <span className="perm-tag">✓ remediation:dispatch</span>
                  <span className="perm-tag">✓ reports:export</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* LOGIN / SWITCH ACCOUNT PANEL */}
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Authenticate / Switch Principal</h3>
            <span className="badge-pill">Bcrypt Salted</span>
          </div>

          <p className="small-desc">
            Demo credentials:
            <br />
            &bull; <code>admin</code> / <code>Admin@Marine2026</code> (Administrator)
            <br />
            &bull; <code>engineer</code> / <code>Engineer@Marine2026</code> (Chief Engineer)
            <br />
            &bull; <code>operator</code> / <code>Operator@Marine2026</code> (Fleet Operator)
            <br />
            &bull; <code>auditor</code> / <code>Auditor@Marine2026</code> (Safety Auditor)
          </p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. admin or engineer"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Authenticating..." : "🔐 Sign In with JWT"}
            </button>
          </form>
        </div>
      </div>

      {/* RBAC MATRIX */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Role-Based Access Control (RBAC) Hierarchy</h3>
          <span className="badge-pill">Maritime Security Standard</span>
        </div>

        <div className="rbac-grid">
          {rbacMatrix.map((r, i) => (
            <div key={i} className="rbac-card">
              <div className="rbac-header">
                <strong>{r.role}</strong>
                <span className="badge-pill">{r.badge}</span>
              </div>
              <p>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* USER DIRECTORY */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Fleet Personnel & Operator Directory</h3>
          <button className="action-btn secondary" onClick={() => setShowAddUserModal(true)}>
            + Register New Operator
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personnel Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td><code>{u.username}</code></td>
                  <td>
                    <span className="status-tag normal">{u.role}</span>
                  </td>
                  <td>{u.department}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="status-tag normal">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Fleet User Account</h3>
              <button className="close-btn" onClick={() => setShowAddUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Lt. Commander Alex Scott"
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ascott"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password (Salted & Hashed with Bcrypt)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="Administrator">Administrator</option>
                  <option value="Chief Engineer">Chief Engineer</option>
                  <option value="Fleet Operator">Fleet Operator</option>
                  <option value="Safety Auditor">Safety Auditor</option>
                </select>
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Machinery Space Watch"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alex.scott@marine-telemetry.io"
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn secondary" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityAccessPage;
