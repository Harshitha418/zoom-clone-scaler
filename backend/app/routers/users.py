"""User endpoints. `/users/me` returns the authenticated user."""
from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..schemas import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_current_user_endpoint(user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return user
