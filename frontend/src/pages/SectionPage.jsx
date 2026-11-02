const moduleData = {
  monitoring: {
    title: "Real-Time Sensor Monitoring",
    description:
      "Monitor live marine engine telemetry including RPM, temperature, oil pressure, vibration, fuel consumption and engine load.",
  },

  predictions: {
    title: "Engine Condition Prediction",
    description:
      "Use the trained machine learning model to estimate failure probability and classify engine risk.",
  },

  alerts: {
    title: "Smart Alerts",
    description:
      "Identify warning and high-risk engine conditions and display actionable alerts.",
  },

  maintenance: {
    title: "Predictive Maintenance",
    description:
      "Generate maintenance recommendations using predicted failure probability and sensor thresholds.",
  },

  analytics: {
    title: "Engine-wise Analytics",
    description:
      "Analyze sensor trends and engine operating behavior using historical telemetry.",
  },

  models: {
    title: "ML Model Comparison",
    description:
      "Compare machine learning models using evaluation metrics such as MAE, RMSE and R².",
  },

  history: {
    title: "Maintenance & Alert History",
    description:
      "Review historical engine readings, predictions, alerts and maintenance actions.",
  },
};

function SectionPage({
  type,
  sensor,
  prediction,
  engineId,
}) {

  const module =
    moduleData[type] || moduleData.monitoring;

  return (
    <div className="module-page">

      <div className="module-hero">

        <span className="panel-label">
          PROJECT FUNCTIONALITY
        </span>

        <h2>
          {module.title}
        </h2>

        <p>
          {module.description}
        </p>

      </div>


      <div className="module-grid">

        <div className="panel">

          <span className="panel-label">
            CURRENT ENGINE
          </span>

          <h3>
            {engineId}
          </h3>

          <div className="module-row">
            <span>RPM</span>

            <strong>
              {Number(
                sensor?.engine_rpm ?? 0
              ).toFixed(0)}
            </strong>
          </div>

          <div className="module-row">
            <span>Temperature</span>

            <strong>
              {Number(
                sensor?.engine_temperature ?? 0
              ).toFixed(1)}
              °C
            </strong>
          </div>

          <div className="module-row">
            <span>Vibration</span>

            <strong>
              {Number(
                sensor?.vibration ?? 0
              ).toFixed(2)}
              mm/s
            </strong>
          </div>

          <div className="module-row">
            <span>Oil Pressure</span>

            <strong>
              {Number(
                sensor?.oil_pressure ?? 0
              ).toFixed(2)}
              bar
            </strong>
          </div>

        </div>


        <div className="panel">

          <span className="panel-label">
            ML RESULT
          </span>

          <div className="big-number">

            {Number(
              prediction?.failure_percentage ?? 0
            ).toFixed(1)}

            <small>
              %
            </small>

          </div>

          <p>
            Failure probability
          </p>

          <div className="module-row">

            <span>
              Risk Level
            </span>

            <strong>
              {prediction?.risk_level ||
                "Waiting"}
            </strong>

          </div>

          <div className="module-row">

            <span>
              Health Score
            </span>

            <strong>
              {Number(
                prediction?.health_score ?? 0
              ).toFixed(1)}
              /100
            </strong>

          </div>

        </div>

      </div>

    </div>
  );
}

export default SectionPage;     