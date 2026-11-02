import React from "react";

const navigationGroups = [
  {
    title: "OVERVIEW",
    items: [
      { id: "dashboard", name: "Dashboard", icon: "▦" },
      { id: "telemetry", name: "Live Telemetry", icon: "◉" },
    ],
  },
  {
    title: "ML & PREDICTIONS",
    items: [
      { id: "prediction", name: "Condition Prediction", icon: "⌁" },
      { id: "models", name: "ML Model Comparison", icon: "▤" },
      { id: "maintenance", name: "Predictive Maintenance", icon: "🔧" },
    ],
  },
  {
    title: "ENGINE OPERATIONS",
    items: [
      { id: "thresholds", name: "Dynamic Thresholds", icon: "🎚" },
      { id: "alerts", name: "Smart Alerts", icon: "⚠" },
      { id: "remediation", name: "Automated Remediation", icon: "🛡" },
    ],
  },
  {
    title: "ANALYTICS & REPORTS",
    items: [
      { id: "analytics", name: "Cloud Data Analytics", icon: "◫" },
      { id: "reports", name: "Reports & Data Export", icon: "📄" },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { id: "security", name: "Security & Access", icon: "🔒" },
      { id: "monitoring", name: "System Monitoring", icon: "☁" },
    ],
  },
];

function Sidebar({ activePage, setActivePage, alertCount = 0 }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <strong>MARINE</strong>
          <span>ENGINE AI</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationGroups.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            <div className="menu-title">{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => setActivePage(item.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.name}</span>
                {item.id === "alerts" && alertCount > 0 && (
                  <span className="sidebar-badge">{alertCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-status">
          <span className="online-dot"></span>
          <div>
            <strong>FastAPI & MongoDB</strong>
            <small>Azure Ready • v2.0</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;