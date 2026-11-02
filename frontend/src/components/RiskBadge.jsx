function RiskBadge({ level = "Unknown" }) {

  const className = level
    .toLowerCase()
    .replace(" ", "-");

  return (
    <span className={`risk-badge risk-${className}`}>
      {level}
    </span>
  );
}

export default RiskBadge;