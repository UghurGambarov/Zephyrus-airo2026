"""Attack simulation route."""

from fastapi import APIRouter

from app.simulation import simulate_attack

router = APIRouter(prefix="/api", tags=["simulation"])


@router.post("/simulate-attack")
def simulate():
    """Run the live attack simulation (recon -> decoys -> brute force -> canary)."""
    return simulate_attack(reset_first=True)
