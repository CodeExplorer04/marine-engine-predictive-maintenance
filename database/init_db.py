"""
 Marine Engine Predictive Maintenance
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "marine_engine_db"

DEFAULT_THRESHOLDS = {
    "engine_temperature_c": {"warning": 95.0, "critical": 110.0, "unit": "°C", "min_limit": 60.0, "max_limit": 130.0},
    "oil_pressure_bar": {"warning_min": 3.0, "critical_min": 2.2, "unit": "bar", "min_limit": 1.0, "max_limit": 7.0},
    "vibration_mm_s": {"warning": 3.5, "critical": 4.8, "unit": "mm/s", "min_limit": 0.0, "max_limit": 15.0},
    "rpm": {"warning_max": 1800.0, "critical_max": 2000.0, "unit": "RPM", "min_limit": 500.0, "max_limit": 2500.0},
    "exhaust_temperature_c": {"warning": 440.0, "critical": 500.0, "unit": "°C", "min_limit": 200.0, "max_limit": 650.0},
    "engine_load_percent": {"warning": 85.0, "critical": 95.0, "unit": "%", "min_limit": 0.0, "max_limit": 100.0},
    "fuel_consumption_l_hr": {"warning": 280.0, "critical": 340.0, "unit": "L/hr", "min_limit": 100.0, "max_limit": 500.0},
}

async def init_database():
    print("=" * 70)
    print("INITIALIZING MARINE ENGINE MONGODB DATABASE")
    print("=" * 70)
    print(f"Connecting to MongoDB at: {MONGODB_URL}")
    print(f"Target Database         : {DATABASE_NAME}")

    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2500)
        await client.admin.command("ping")
        print("✓ Successfully connected to MongoDB daemon.\n")

        db = client[DATABASE_NAME]

        # 1. Sensors Collection & Indexing
        await db.sensors.create_index([("engine_id", 1), ("timestamp", -1)])
        print("✓ Created compound index on sensors: (engine_id ASC, timestamp DESC)")

        # 2. Alerts Collection & Indexing
        await db.alerts.create_index([("engine_id", 1), ("created_at", -1)])
        print("✓ Created compound index on alerts: (engine_id ASC, created_at DESC)")

        # 3. Anomalies Collection & Indexing
        await db.anomalies.create_index([("engine_id", 1), ("timestamp", -1)])
        print("✓ Created compound index on anomalies: (engine_id ASC, timestamp DESC)")

        # 4. Remediation Collection & Indexing
        await db.remediation.create_index([("engine_id", 1), ("created_at", -1)])
        print("✓ Created compound index on remediation: (engine_id ASC, created_at DESC)")

        # 5. Users Collection & Indexing
        await db.users.create_index([("username", 1)], unique=True)
        print("✓ Created unique index on users: (username UNIQUE)")

        # 6. Initialize Default Thresholds if absent
        existing_th = await db.thresholds.find_one({"type": "active"})
        if not existing_th:
            await db.thresholds.insert_one({
                "type": "active",
                "values": DEFAULT_THRESHOLDS,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": "System Initialization"
            })
            print("✓ Seeded default IMO marine thresholds into 'thresholds' collection.")
        else:
            print("✓ Active thresholds already initialized.")

        # Summary Statistics
        collections = await db.list_collection_names()
        print("\n--- Current Database Summary ---")
        for col in collections:
            cnt = await db[col].count_documents({})
            print(f"  • {col:<15}: {cnt:>5} document(s)")

        print("\n" + "=" * 70)
        print("DATABASE INITIALIZATION & VERIFICATION COMPLETE")
        print("=" * 70)

    except Exception as error:
        print(f"\n[ERROR] Could not connect to MongoDB: {error}")
        print("Ensure the MongoDB service is running (mongod on port 27017).")

if __name__ == "__main__":
    asyncio.run(init_database())
