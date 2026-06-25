"""State routes: health, current state, reset."""

from fastapi import APIRouter

from app.store import store

router = APIRouter(tags=["state"])


@router.get("/")
def root():
    return {
        "name": "Zephyrus City Trap",
        "status": "running",
        "message": "Backend is up. Full system ready.",
    }


@router.get("/api/state")
def get_state():
    """Full current state — the frontend polls this every second."""
    return store.get_state()


@router.post("/api/reset")
def reset_state():
    store.reset()
    return {"status": "reset", "message": "Bütün hadisə və siqnallar sıfırlandı."}
