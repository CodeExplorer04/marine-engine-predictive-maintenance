from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field, ConfigDict, model_validator

def _normalize_sensor_dict(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    d = dict(data)
    # Map common aliases from simulator and UI payloads
    if "rpm" not in d:
        if "engine_rpm" in d:
            d["rpm"] = d["engine_rpm"]
        elif "RPM" in d:
            d["rpm"] = d["RPM"]
    if "engine_temperature_c" not in d:
        if "engine_temperature" in d:
            d["engine_temperature_c"] = d["engine_temperature"]
        elif "Engine_Temperature_C" in d:
            d["engine_temperature_c"] = d["Engine_Temperature_C"]
    if "oil_pressure_bar" not in d:
        if "oil_pressure" in d:
            d["oil_pressure_bar"] = d["oil_pressure"]
        elif "Oil_Pressure_bar" in d:
            d["oil_pressure_bar"] = d["Oil_Pressure_bar"]
    if "vibration_mm_s" not in d:
        if "vibration" in d:
            d["vibration_mm_s"] = d["vibration"]
        elif "Vibration_mm_s" in d:
            d["vibration_mm_s"] = d["Vibration_mm_s"]
    if "engine_load_percent" not in d:
        if "engine_load" in d:
            d["engine_load_percent"] = d["engine_load"]
        elif "Engine_Load_Percent" in d:
            d["engine_load_percent"] = d["Engine_Load_Percent"]
    if "exhaust_temperature_c" not in d:
        if "exhaust_temperature" in d:
            d["exhaust_temperature_c"] = d["exhaust_temperature"]
        elif "Exhaust_Temperature_C" in d:
            d["exhaust_temperature_c"] = d["Exhaust_Temperature_C"]
    if "fuel_consumption_l_hr" not in d:
        if "fuel_consumption" in d:
            d["fuel_consumption_l_hr"] = d["fuel_consumption"]
        elif "Fuel_Consumption_L_hr" in d:
            d["fuel_consumption_l_hr"] = d["Fuel_Consumption_L_hr"]
    if "operating_hours" not in d:
        if "Operating_Hours" in d:
            d["operating_hours"] = d["Operating_Hours"]
        else:
            d["operating_hours"] = 5000.0

    return d

class SensorReading(BaseModel):
    engine_id: str = Field(..., min_length=1, max_length=80)
    operating_hours: float = Field(default=5000.0, ge=0)
    engine_load_percent: float = Field(..., ge=0, le=100)
    engine_temperature_c: float = Field(..., ge=0, le=250)
    oil_pressure_bar: float = Field(..., ge=0, le=30)
    rpm: float = Field(..., ge=0, le=10000)
    exhaust_temperature_c: float = Field(..., ge=0, le=1000)
    vibration_mm_s: float = Field(..., ge=0, le=100)
    fuel_consumption_l_hr: float = Field(..., ge=0, le=10000)
    timestamp: datetime | None = None
    coolant_temperature: float | None = None
    ambient_temperature: float | None = None

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        return _normalize_sensor_dict(data)

class SensorReadingOut(SensorReading):
    record_id: str | None = None
    failure_probability: float | None = None
    engine_condition: str | None = None
    engine_health_score: int | None = None
    model_config = ConfigDict(extra="allow")

class PredictionRequest(BaseModel):
    engine_id: str = Field(default="ENGINE-001", min_length=1, max_length=80)
    operating_hours: float = Field(default=5000.0, ge=0)
    engine_load_percent: float = Field(..., ge=0, le=100)
    engine_temperature_c: float = Field(..., ge=0, le=250)
    oil_pressure_bar: float = Field(..., ge=0, le=30)
    rpm: float = Field(..., ge=0, le=10000)
    exhaust_temperature_c: float = Field(..., ge=0, le=1000)
    vibration_mm_s: float = Field(..., ge=0, le=100)
    fuel_consumption_l_hr: float = Field(..., ge=0, le=10000)

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        return _normalize_sensor_dict(data)

class AlertOut(BaseModel):
    alert_id: str | None = None
    engine_id: str
    alert_type: str
    severity: str
    message: str
    created_at: datetime
    acknowledged: bool = False

