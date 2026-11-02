def classify_risk(probability: float) -> tuple[str, int, str]:
    """Map failure probability to a readable condition and 0-100 health score."""
    p = max(0.0, min(1.0, float(probability)))
    if p >= 0.70:
        return "High Risk", round((1 - p) * 100), "Stop and inspect the engine as soon as safely possible."
    if p >= 0.35:
        return "Warning", round((1 - p) * 100), "Schedule an inspection and monitor sensor trends."
    return "Normal", round((1 - p) * 100), "Continue routine monitoring and scheduled maintenance."
