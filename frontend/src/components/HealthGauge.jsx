function HealthGauge({ score = 0 }) {

  const health = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  return (
    <div className="health-container">

      <div
        className="health-circle"
        style={{
          "--health": `${health * 3.6}deg`,
        }}
      >

        <div className="health-inner">

          <strong>
            {health.toFixed(1)}
          </strong>

          <span>
            HEALTH SCORE
          </span>

        </div>

      </div>

      <div className="health-labels">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

    </div>
  );
}

export default HealthGauge;