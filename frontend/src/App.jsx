import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import ConditionPredictionPage from "./pages/ConditionPredictionPage";
import ModelComparisonPage from "./pages/ModelComparisonPage";
import PredictiveMaintenancePage from "./pages/PredictiveMaintenancePage";
import ThresholdManagementPage from "./pages/ThresholdManagementPage";
import SmartAlertsPage from "./pages/SmartAlertsPage";
import AutomatedRemediationPage from "./pages/AutomatedRemediationPage";
import TelemetrySimulatorPage from "./pages/TelemetrySimulatorPage";
import CloudAnalyticsPage from "./pages/CloudAnalyticsPage";
import ReportsExportPage from "./pages/ReportsExportPage";
import SecurityAccessPage from "./pages/SecurityAccessPage";
import SystemMonitoringPage from "./pages/SystemMonitoringPage";

import {
  getLatestSensor,
  getSensorHistory,
  predictFailure,
  getDashboardSummary,
  getAlertsStats,
  triggerSimulation,
} from "./services/api";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [engineId, setEngineId] = useState("ENGINE-001");

  const [sensor, setSensor] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  const [currentUser, setCurrentUser] = useState({
    name: "Capt. David Vance",
    role: "Administrator",
    username: "admin",
    department: "Fleet Engineering Command",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch latest sensor telemetry
      let latestSensor = null;
      try {
        latestSensor = await getLatestSensor(engineId);
        setSensor(latestSensor);
      } catch (err) {
        console.warn(`No telemetry recorded yet for ${engineId}`);
      }

      // 2. Fetch or compute ML prediction
      if (latestSensor) {
        const predictionResult = await predictFailure({
          engine_id: engineId,
          operating_hours: Number(latestSensor.operating_hours ?? 8000),
          engine_load_percent: Number(latestSensor.engine_load_percent ?? latestSensor.engine_load ?? 60),
          engine_temperature_c: Number(latestSensor.engine_temperature_c ?? latestSensor.engine_temperature ?? 85),
          oil_pressure_bar: Number(latestSensor.oil_pressure_bar ?? latestSensor.oil_pressure ?? 4.0),
          rpm: Number(latestSensor.rpm ?? latestSensor.engine_rpm ?? 1450),
          exhaust_temperature_c: Number(latestSensor.exhaust_temperature_c ?? latestSensor.exhaust_temperature ?? 360),
          vibration_mm_s: Number(latestSensor.vibration_mm_s ?? latestSensor.vibration ?? 2.1),
          fuel_consumption_l_hr: Number(latestSensor.fuel_consumption_l_hr ?? latestSensor.fuel_consumption ?? 210),
        });
        setPrediction(predictionResult);
      }

      // 3. Sensor history
      const historyResult = await getSensorHistory(engineId, 30);
      setHistory(historyResult.readings || []);

      // 4. Fleet summary and active alerts count
      const summaryRes = await getDashboardSummary();
      setFleetSummary(summaryRes);

      const alertStatsRes = await getAlertsStats();
      setAlertCount(alertStatsRes.active || 0);
    } catch (err) {
      console.error(err);
      setError(
        "FastAPI backend connection error. Ensure Uvicorn server is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, [engineId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSimulate = async (eng, scenario = "mixed") => {
    try {
      await triggerSimulation(eng, scenario);
      await loadData();
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const renderActivePage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            sensor={sensor}
            prediction={prediction}
            history={history}
            engineId={engineId}
            onNavigate={setActivePage}
            onSimulate={handleSimulate}
            fleetSummary={fleetSummary}
          />
        );
      case "telemetry":
        return (
          <TelemetrySimulatorPage
            engineId={engineId}
            setEngineId={setEngineId}
            onReadingIngested={loadData}
          />
        );
      case "prediction":
        return (
          <ConditionPredictionPage
            engineId={engineId}
            sensor={sensor}
          />
        );
      case "models":
        return <ModelComparisonPage />;
      case "maintenance":
        return (
          <PredictiveMaintenancePage
            engineId={engineId}
            setEngineId={setEngineId}
          />
        );
      case "thresholds":
        return <ThresholdManagementPage />;
      case "alerts":
        return (
          <SmartAlertsPage
            engineId={engineId}
            onAlertsUpdated={(cnt) => setAlertCount(cnt)}
          />
        );
      case "remediation":
        return <AutomatedRemediationPage engineId={engineId} />;
      case "analytics":
        return <CloudAnalyticsPage engineId={engineId} />;
      case "reports":
        return <ReportsExportPage engineId={engineId} />;
      case "security":
        return (
          <SecurityAccessPage
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        );
      case "monitoring":
        return <SystemMonitoringPage />;
      default:
        return (
          <Dashboard
            sensor={sensor}
            prediction={prediction}
            history={history}
            engineId={engineId}
            onNavigate={setActivePage}
            onSimulate={handleSimulate}
            fleetSummary={fleetSummary}
          />
        );
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        alertCount={alertCount}
      />

      <main className="main-content">
        <Header
          engineId={engineId}
          setEngineId={setEngineId}
          refresh={loadData}
          loading={loading}
          alertCount={alertCount}
          onNavigate={setActivePage}
          onSimulate={handleSimulate}
          currentUser={currentUser}
        />

        {error && <div className="error-banner">⚠ {error}</div>}

        <div className="page-content-wrapper">
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}

export default App;