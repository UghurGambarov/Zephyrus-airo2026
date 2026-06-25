"""FastAPI application factory and entry point.

Run with:  uvicorn app.main:app --reload --port 8010   (from the backend/ dir)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, reports, simulation, state
from app.core.config import settings
from app.decoys import router as decoy_router


def create_app() -> FastAPI:
    app = FastAPI(title="Zephyrus City Trap — Detection Engine")

    # CORS is restricted to configured origins (never "*" in production).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(state.router)
    app.include_router(analysis.router)
    app.include_router(simulation.router)
    app.include_router(reports.router)
    app.include_router(decoy_router)
    return app


app = create_app()
