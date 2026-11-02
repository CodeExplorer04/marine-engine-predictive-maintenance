import os
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
import bcrypt
from app.config import PROJECT_ROOT

JWT_SECRET = os.getenv("JWT_SECRET", "marine-engine-secret-key-capstone-2026-auth-prod")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

ROLE_PERMISSIONS = {
    "Administrator": [
        "dashboard:read", "sensors:read", "sensors:write",
        "predict:execute", "anomalies:read", "models:read",
        "thresholds:read", "thresholds:write",
        "alerts:read", "alerts:manage",
        "remediation:read", "remediation:manage",
        "analytics:read", "reports:export",
        "users:manage", "monitoring:read"
    ],
    "Chief Engineer": [
        "dashboard:read", "sensors:read", "sensors:write",
        "predict:execute", "anomalies:read", "models:read",
        "thresholds:read", "thresholds:write",
        "alerts:read", "alerts:manage",
        "remediation:read", "remediation:manage",
        "analytics:read", "reports:export", "monitoring:read"
    ],
    "Fleet Operator": [
        "dashboard:read", "sensors:read", "sensors:write",
        "predict:execute", "anomalies:read", "models:read",
        "thresholds:read", "alerts:read", "alerts:manage",
        "remediation:read", "analytics:read", "reports:export", "monitoring:read"
    ],
    "Safety Auditor": [
        "dashboard:read", "sensors:read", "predict:execute",
        "anomalies:read", "models:read", "thresholds:read",
        "alerts:read", "remediation:read", "analytics:read",
        "reports:export", "monitoring:read"
    ]
}

DEFAULT_USERS_DB = [
    {
        "id": "usr-1",
        "username": "admin",
        "password_hash": bcrypt.hashpw(b"Admin@Marine2026", bcrypt.gensalt()).decode("utf-8"),
        "full_name": "Captain David Vance",
        "role": "Administrator",
        "department": "Fleet Engineering Command",
        "email": "david.vance@marine-telemetry.io",
        "created_at": "2026-01-15T08:00:00Z",
        "active": True
    },
    {
        "id": "usr-2",
        "username": "engineer",
        "password_hash": bcrypt.hashpw(b"Engineer@Marine2026", bcrypt.gensalt()).decode("utf-8"),
        "full_name": "Elena Rostova",
        "role": "Chief Engineer",
        "department": "Propulsion & Machinery",
        "email": "elena.rostova@marine-telemetry.io",
        "created_at": "2026-02-10T10:00:00Z",
        "active": True
    },
    {
        "id": "usr-3",
        "username": "operator",
        "password_hash": bcrypt.hashpw(b"Operator@Marine2026", bcrypt.gensalt()).decode("utf-8"),
        "full_name": "Marcus Chen",
        "role": "Fleet Operator",
        "department": "Watchkeeping & Monitoring",
        "email": "marcus.chen@marine-telemetry.io",
        "created_at": "2026-03-01T14:30:00Z",
        "active": True
    },
    {
        "id": "usr-4",
        "username": "auditor",
        "password_hash": bcrypt.hashpw(b"Auditor@Marine2026", bcrypt.gensalt()).decode("utf-8"),
        "full_name": "Sarah Lindqvist",
        "role": "Safety Auditor",
        "department": "Maritime Safety & Compliance",
        "email": "sarah.lindqvist@marine-telemetry.io",
        "created_at": "2026-03-20T09:15:00Z",
        "active": True
    }
]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user["username"],
        "user_id": user["id"],
        "name": user["full_name"],
        "role": user["role"],
        "department": user["department"],
        "permissions": ROLE_PERMISSIONS.get(user["role"], []),
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def authenticate_user(username: str, password: str) -> Optional[dict]:
    for u in DEFAULT_USERS_DB:
        if u["username"].lower() == username.lower() and u.get("active", True):
            if verify_password(password, u["password_hash"]):
                return {
                    "id": u["id"],
                    "username": u["username"],
                    "full_name": u["full_name"],
                    "role": u["role"],
                    "department": u["department"],
                    "email": u["email"],
                    "permissions": ROLE_PERMISSIONS.get(u["role"], [])
                }
    return None

def get_all_users() -> list:
    return [
        {
            "id": u["id"],
            "username": u["username"],
            "full_name": u["full_name"],
            "role": u["role"],
            "department": u["department"],
            "email": u["email"],
            "created_at": u["created_at"],
            "active": u.get("active", True)
        }
        for u in DEFAULT_USERS_DB
    ]

def add_user(username: str, password: str, full_name: str, role: str, department: str, email: str) -> dict:
    for u in DEFAULT_USERS_DB:
        if u["username"].lower() == username.lower():
            raise ValueError(f"Username '{username}' already exists")
    
    new_user = {
        "id": f"usr-{len(DEFAULT_USERS_DB) + 1}",
        "username": username,
        "password_hash": hash_password(password),
        "full_name": full_name,
        "role": role if role in ROLE_PERMISSIONS else "Fleet Operator",
        "department": department,
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    DEFAULT_USERS_DB.append(new_user)
    return {
        "id": new_user["id"],
        "username": new_user["username"],
        "full_name": new_user["full_name"],
        "role": new_user["role"],
        "department": new_user["department"],
        "email": new_user["email"],
        "created_at": new_user["created_at"],
        "active": True
    }
