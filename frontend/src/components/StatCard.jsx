function StatCard({
  title,
  value,
  unit,
  icon,
  status,
}) {
  return (
    <div className="stat-card">

      <div className="stat-header">

        <span>
          {title}
        </span>

        <span className="stat-icon">
          {icon}
        </span>

      </div>

      <div className="stat-value">

        {value}

        <small>
          {unit}
        </small>

      </div>

      {status && (
        <div className={`stat-status ${status
          .toLowerCase()
          .replace(" ", "-")}`}>

          {status}

        </div>
      )}

    </div>
  );
}

export default StatCard;
