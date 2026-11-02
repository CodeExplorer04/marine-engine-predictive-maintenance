function SensorCard({
  title,
  value,
  unit,
  icon,
  warning = false,
}) {
  return (
    <div
      className={`sensor-card ${
        warning ? "warning" : ""
      }`}
    >

      <div className="sensor-icon">
        {icon}
      </div>

      <div className="sensor-content">

        <span>
          {title}
        </span>

        <strong>
          {value}

          <small>
            {unit}
          </small>
        </strong>

      </div>

      {warning && (
        <span className="warning-icon">
          !
        </span>
      )}

    </div>
  );
}

export default SensorCard;