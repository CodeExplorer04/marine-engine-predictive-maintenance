const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

let authToken = localStorage.getItem("marine_engine_token") || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("marine_engine_token", token);
  } else {
    localStorage.removeItem("marine_engine_token");
  }
}

export function getStoredAuthToken() {
  return authToken;
}

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorText = "";
    try {
      const errJson = await response.json();
      errorText = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorText = await response.text();
    }
    throw new Error(errorText || `HTTP Error ${response.status}`);
  }

  // If response is text or CSV
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    return response.blob();
  }

  return response.json();
}

// 1. Sensors & Telemetry
export function getLatestSensor(engineId) {
  return request(`/api/sensors/latest/${encodeURIComponent(engineId)}`);
}

export function getSensorHistory(engineId, limit = 50) {
  return request(`/api/sensors/history/${encodeURIComponent(engineId)}?limit=${limit}`);
}

export function getEnginesList() {
  return request("/api/sensors/engines");
}

export function triggerSimulation(engineId = "ENGINE-001", scenario = "mixed") {
  return request("/api/sensors/simulate", {
    method: "POST",
    body: JSON.stringify({ engine_id: engineId, scenario }),
  });
}

export function submitSensorReading(reading) {
  return request("/api/sensors/", {
    method: "POST",
    body: JSON.stringify(reading),
  });
}

// 2. ML Condition Prediction
export function predictFailure(data) {
  return request("/api/predict/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 3. Anomaly Detection
export function detectAnomalies(data) {
  return request("/api/anomaly/detect", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAnomalyHistory(engineId = "all", limit = 50) {
  return request(`/api/anomaly/history/${encodeURIComponent(engineId)}?limit=${limit}`);
}

export function getAnomalyStats() {
  return request("/api/anomaly/stats");
}

// 4. ML Model Comparison
export function getModelComparison() {
  return request("/api/models/comparison");
}

export function getModelDetails(modelAbbr) {
  return request(`/api/models/details/${encodeURIComponent(modelAbbr)}`);
}

// 5. Predictive Maintenance
export function getMaintenanceOverview() {
  return request("/api/maintenance/overview");
}

export function getMaintenanceRecommendations(engineId) {
  return request(`/api/maintenance/recommendations/${encodeURIComponent(engineId)}`);
}

// 6. Dynamic Thresholds
export function getActiveThresholds() {
  return request("/api/thresholds/");
}

export function updateThresholds(thresholds, user = "Chief Engineer") {
  return request("/api/thresholds/", {
    method: "PUT",
    body: JSON.stringify({ thresholds, user }),
  });
}

export function resetThresholds(user = "Chief Engineer") {
  return request("/api/thresholds/reset", {
    method: "POST",
    body: JSON.stringify({ user }),
  });
}

// 7. Smart Alerts
export function getAlerts(params = {}) {
  const query = new URLSearchParams();
  if (params.engine_id && params.engine_id !== "all") query.append("engine_id", params.engine_id);
  if (params.severity && params.severity !== "all") query.append("severity", params.severity);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.limit) query.append("limit", params.limit);
  return request(`/api/alerts/?${query.toString()}`);
}

export function getAlertsStats() {
  return request("/api/alerts/stats");
}

export function acknowledgeAlert(alertId) {
  return request(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: "POST",
  });
}

export function resolveAlert(alertId) {
  return request(`/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: "POST",
  });
}

// 8. Automated Remediation
export function getRemediationActions(params = {}) {
  const query = new URLSearchParams();
  if (params.engine_id && params.engine_id !== "all") query.append("engine_id", params.engine_id);
  if (params.status && params.status !== "all") query.append("status", params.status);
  return request(`/api/remediation/actions?${query.toString()}`);
}

export function updateRemediationStatus(actionId, status, notes = "") {
  return request(`/api/remediation/actions/${encodeURIComponent(actionId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, notes, completed_by: "Marine Engineer" }),
  });
}

export function createRemediationAction(actionData) {
  return request("/api/remediation/actions/create", {
    method: "POST",
    body: JSON.stringify(actionData),
  });
}

// 9. Analytics & Dashboard Summary
export function getDashboardSummary() {
  return request("/api/analytics/summary");
}

export function getEngineAnalytics(engineId, limit = 50) {
  return request(`/api/analytics/engine/${encodeURIComponent(engineId)}?limit=${limit}`);
}

export function getFleetStats(params = {}) {
  const query = new URLSearchParams();
  if (params.engine_id) query.append("engine_id", params.engine_id);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  return request(`/api/analytics/fleet-stats?${query.toString()}`);
}

// 10. Reports & CSV Export
export function generateReport(params = {}) {
  const query = new URLSearchParams();
  if (params.engine_id) query.append("engine_id", params.engine_id);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.report_type) query.append("report_type", params.report_type);
  return request(`/api/reports/generate?${query.toString()}`);
}

export function getExportCsvUrl(params = {}) {
  const query = new URLSearchParams();
  if (params.engine_id) query.append("engine_id", params.engine_id);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.data_type) query.append("data_type", params.data_type);
  return `${API_BASE_URL}/api/reports/export-csv?${query.toString()}`;
}

// 11. Security & Authentication
export function loginUser(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export function getUsersList() {
  return request("/api/auth/users");
}

export function createUser(userData) {
  return request("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

// 12. System Monitoring
export function getSystemMonitoring() {
  return request("/api/monitoring/status");
}

export function getBackendHealth() {
  return request("/api/health");
}