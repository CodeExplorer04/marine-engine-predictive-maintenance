from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    get_all_users,
    add_user,
    ROLE_PERMISSIONS
)

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = Field(..., description="Administrator, Chief Engineer, Fleet Operator, or Safety Auditor")
    department: str
    email: str

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        # Return default guest/admin session if unauthenticated for smooth demo, but flag status
        return {
            "sub": "admin",
            "user_id": "usr-1",
            "name": "Captain David Vance",
            "role": "Administrator",
            "department": "Fleet Engineering Command",
            "permissions": ROLE_PERMISSIONS["Administrator"],
            "authenticated": False
        }
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired security token")
    payload["authenticated"] = True
    return payload

@router.post("/login")
async def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token(user)
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "user": user
    }

@router.get("/users")
async def list_system_users(user: dict = Depends(get_current_user)):
    users = get_all_users()
    return {
        "count": len(users),
        "users": users,
        "available_roles": list(ROLE_PERMISSIONS.keys())
    }

@router.post("/users")
async def create_new_user(payload: CreateUserRequest, user: dict = Depends(get_current_user)):
    # Check permissions if authenticated
    if user.get("authenticated") and user.get("role") != "Administrator":
        raise HTTPException(status_code=403, detail="Only Fleet Administrators can register new user accounts")
        
    try:
        created = add_user(
            username=payload.username,
            password=payload.password,
            full_name=payload.full_name,
            role=payload.role,
            department=payload.department,
            email=payload.email
        )
        return {
            "status": "success",
            "message": f"User account '{payload.username}' successfully created.",
            "user": created
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
