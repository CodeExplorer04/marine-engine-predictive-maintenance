import React, { useState, useEffect } from "react";
import { getModelComparison } from "../services/api";

function ModelComparisonPage() {
  const [data, setData] = useState(null);
  const [selectedModel, setSelectedModel] = useState("RF");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getModelComparison();
        setData(res);
      } catch (err) {
        setError(err.message || "Failed to load model comparison metrics.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="feature-page">
        <div className="panel">
          <p>Loading trained model comparison metrics from FastAPI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feature-page">
        <div className="error-banner">⚠ {error}</div>
      </div>
    );
  }

  const models = data?.models || [];
  const current = models.find((m) => m.abbr === selectedModel) || models[2];

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <span className="panel-label">BENCHMARKING & EVALUATION</span>
          <h2>Machine Learning Model Comparison</h2>
          <p>
            Comparative empirical evaluation of 4 supervised models on 15,000 synthetic marine engine telemetry records (80/20 train/test split).
          </p>
        </div>
        <div className="model-pill-selector">
          {models.map((m) => (
            <button
              key={m.abbr}
              className={`pill-btn ${selectedModel === m.abbr ? "active" : ""}`}
              onClick={() => setSelectedModel(m.abbr)}
            >
              {m.name} ({m.abbr})
            </button>
          ))}
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="panel">
        <div className="panel-title-bar">
          <h3>Empirical Performance Matrix</h3>
          <span className="badge-pill">Dataset: {data?.dataset_rows} samples</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Classification Accuracy</th>
                <th>Weighted F1-Score</th>
                <th>Regression MAE</th>
                <th>Regression RMSE</th>
                <th>Regression R²</th>
                <th>Benchmark Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr
                  key={m.abbr}
                  className={selectedModel === m.abbr ? "selected-row" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedModel(m.abbr)}
                >
                  <td>
                    <strong>{m.name}</strong> <small>({m.abbr})</small>
                  </td>
                  <td>{(m.accuracy * 100).toFixed(2)}%</td>
                  <td>{m.f1_score.toFixed(4)}</td>
                  <td>{m.mae.toFixed(4)}</td>
                  <td>{m.rmse.toFixed(4)}</td>
                  <td>
                    <strong style={{ color: m.r2_score > 0.95 ? "#38ef7d" : "#72c2ff" }}>
                      {m.r2_score.toFixed(4)}
                    </strong>
                  </td>
                  <td>
                    {m.abbr === "RF" ? (
                      <span className="status-tag critical">Selected Production</span>
                    ) : (
                      <span className="status-tag normal">Evaluated Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2-col">
        {/* CONFUSION MATRIX */}
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Confusion Matrix: {current?.name}</h3>
            <span className="badge-pill">Test: {data?.test_samples} Samples</span>
          </div>

          <p className="small-desc">
            Evaluates prediction distribution across <strong>Normal</strong>, <strong>Warning</strong>, and <strong>High Risk</strong> engine conditions.
          </p>

          <div className="confusion-matrix-wrapper">
            <div className="cm-header-row">
              <span className="cm-corner">Actual \ Pred</span>
              {current?.classes?.map((c, i) => (
                <span key={i} className="cm-col-label">{c}</span>
              ))}
            </div>

            {current?.confusion_matrix?.map((row, rIdx) => (
              <div key={rIdx} className="cm-row">
                <span className="cm-row-label">{current?.classes[rIdx]}</span>
                {row.map((cell, cIdx) => (
                  <div
                    key={cIdx}
                    className={`cm-cell ${rIdx === cIdx ? "diagonal" : "off-diagonal"}`}
                  >
                    <strong>{cell}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FEATURE IMPORTANCE */}
        <div className="panel">
          <div className="panel-title-bar">
            <h3>Feature Importance Ranking</h3>
            <span className="badge-pill">{current?.abbr} Weights</span>
          </div>

          <p className="small-desc">
            Relative impact of each sensor parameter on the model's failure probability prediction.
          </p>

          <div className="feature-importance-list">
            {Object.entries(current?.feature_importance || {})
              .sort((a, b) => b[1] - a[1])
              .map(([feat, imp], i) => (
                <div key={i} className="importance-row">
                  <div className="imp-label">
                    <span>{feat.replace(/_/g, " ")}</span>
                    <strong>{(imp * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="impact-bar-track">
                    <div
                      style={{
                        width: `${Math.min(imp * 100 * 2, 100)}%`,
                        backgroundColor: i === 0 ? "#72c2ff" : i < 3 ? "#45a9f5" : "#1b2c3e",
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelComparisonPage;
