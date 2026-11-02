import time
import random
import argparse
from datetime import datetime, timezone
import requests

API_URL = "http://127.0.0.1:8000/api/sensors/"

ENGINES = {
    "ENGINE-001": {"name": "Port Main Propulsion", "base_hours": 12450.0},
    "ENGINE-002": {"name": "Starboard Main Propulsion", "base_hours": 11820.0},
    "ENGINE-003": {"name": "Auxiliary Generator 1", "base_hours": 8340.0},
    "ENGINE-004": {"name": "Emergency Diesel Generator", "base_hours": 3210.0},
}

DEFAULT_INTERVAL_SECONDS = 3

def generate_sensor_reading(engine_id: str = "ENGINE-001", scenario: str = "mixed", hours_increment: float = 0.0) -> dict:
    """
    Generate simulated marine engine telemetry.

    ACADEMIC NOTICE:
    These telemetry records are synthetic data generated for educational and
    demonstration purposes and do NOT represent live vessel operations.
    """
    if scenario == "mixed":
        condition = random.choices(["normal", "warning", "high_risk"], weights=[0.65, 0.25, 0.10])[0]
    else:
        condition = scenario

    if condition == "normal":
        rpm = random.uniform(1200, 1600)
        engine_temperature = random.uniform(75, 92)
        oil_pressure = random.uniform(4.0, 5.5)
        vibration = random.uniform(1.0, 2.8)
        engine_load = random.uniform(40, 70)
        exhaust_temperature = random.uniform(300, 390)
        fuel_consumption = random.uniform(180, 240)
    elif condition == "warning":
        rpm = random.uniform(1400, 1750)
        engine_temperature = random.uniform(92, 108)
        oil_pressure = random.uniform(2.8, 3.8)
        vibration = random.uniform(2.9, 4.3)
        engine_load = random.uniform(65, 85)
        exhaust_temperature = random.uniform(390, 460)
        fuel_consumption = random.uniform(230, 290)
    else:  # high_risk
        rpm = random.uniform(1500, 1900)
        engine_temperature = random.uniform(108, 126)
        oil_pressure = random.uniform(1.8, 2.9)
        vibration = random.uniform(4.5, 6.8)
        engine_load = random.uniform(82, 98)
        exhaust_temperature = random.uniform(460, 540)
        fuel_consumption = random.uniform(280, 360)

    coolant_temperature = engine_temperature - random.uniform(6, 14)
    ambient_temperature = random.uniform(24, 34)
    base_hours = ENGINES.get(engine_id, {}).get("base_hours", 5000.0)
    operating_hours = round(base_hours + hours_increment, 1)

    reading = {
        "engine_id": engine_id,
        "operating_hours": operating_hours,
        "engine_load_percent": round(engine_load, 2),
        "engine_temperature_c": round(engine_temperature, 2),
        "oil_pressure_bar": round(oil_pressure, 2),
        "rpm": round(rpm, 2),
        "exhaust_temperature_c": round(exhaust_temperature, 2),
        "vibration_mm_s": round(vibration, 2),
        "fuel_consumption_l_hr": round(fuel_consumption, 2),
        "coolant_temperature": round(coolant_temperature, 2),
        "ambient_temperature": round(ambient_temperature, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        # Common UI convenience aliases
        "engine_rpm": round(rpm, 2),
        "engine_temperature": round(engine_temperature, 2),
        "oil_pressure": round(oil_pressure, 2),
        "vibration": round(vibration, 2),
        "engine_load": round(engine_load, 2),
        "exhaust_temperature": round(exhaust_temperature, 2),
        "fuel_consumption": round(fuel_consumption, 2),
    }

    return reading

def send_sensor_reading(reading: dict, api_url: str = API_URL) -> bool:
    try:
        response = requests.post(api_url, json=reading, timeout=5)
        if response.status_code in [200, 201]:
            data = response.json()
            pred = data.get("prediction", {})
            cond = pred.get("engine_condition", "N/A")
            prob = pred.get("failure_probability_percent", 0.0)
            alert = data.get("alert")
            alert_tag = f" [ALERT: {alert.get('severity').upper()}]" if alert else ""
            print(
                f"[SENT] {reading['engine_id']} | "
                f"RPM={reading['rpm']:.0f} | "
                f"Temp={reading['engine_temperature_c']:.1f}°C | "
                f"Vib={reading['vibration_mm_s']:.2f}mm/s | "
                f"Load={reading['engine_load_percent']:.0f}% -> "
                f"Condition={cond} ({prob:.1f}% risk){alert_tag}"
            )
            return True
        else:
            print(f"[ERROR] API returned {response.status_code}: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Could not connect to FastAPI. Verify server is running on port 8000.")
        return False
    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Request failed: {error}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Marine Engine Telemetry Simulator")
    parser.add_argument("--engine", default="all", help="Engine ID (e.g. ENGINE-001 or 'all')")
    parser.add_argument("--scenario", default="mixed", choices=["mixed", "normal", "warning", "high_risk"], help="Telemetry condition scenario")
    parser.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_SECONDS, help="Seconds between readings")
    parser.add_argument("--count", type=int, default=0, help="Number of cycles to send (0 = run forever)")
    args = parser.parse_args()

    engine_list = list(ENGINES.keys()) if args.engine == "all" else [args.engine]

    print("=" * 70)
    print("MARINE ENGINE TELEMETRY SIMULATOR")
    print("=" * 70)
    print(f"Target API     : {API_URL}")
    print(f"Engines        : {', '.join(engine_list)}")
    print(f"Scenario       : {args.scenario}")
    print(f"Interval       : {args.interval}s")
    print(f"Cycle Count    : {'Infinite (Ctrl+C to stop)' if args.count == 0 else args.count}")
    print("NOTE: Simulated telemetry for Marine Engine Demonstration.")
    print("=" * 70)

    cycles = 0
    hours_acc = 0.0
    try:
        while True:
            for eng in engine_list:
                reading = generate_sensor_reading(engine_id=eng, scenario=args.scenario, hours_increment=hours_acc)
                send_sensor_reading(reading)
            hours_acc += 0.1
            cycles += 1
            if args.count > 0 and cycles >= args.count:
                print(f"\nCompleted {cycles} simulation cycle(s).")
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")

if __name__ == "__main__":
    main()
