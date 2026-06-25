"""Environment-driven application settings.

All runtime configuration is read from the environment (see .env.example).
Nothing about the deployment environment is hardcoded in the code.
"""

import os
from pathlib import Path


def _default_data_dir() -> Path:
    # backend/app/core/config.py -> parents[3] is the repository root.
    return Path(__file__).resolve().parents[3] / "data"


class Settings:
    def __init__(self) -> None:
        self.port: int = int(os.environ.get("PORT", "8010"))

        # Comma-separated allowed CORS origins. Never use "*" in production.
        raw_origins = os.environ.get("CORS_ALLOW_ORIGINS", "http://localhost:5173")
        self.cors_allow_origins: list[str] = [
            o.strip() for o in raw_origins.split(",") if o.strip()
        ]

        # Optional: enables Claude-generated incident reports.
        self.anthropic_api_key: str | None = os.environ.get("ANTHROPIC_API_KEY") or None

        # Where sample-data.csv lives.
        self.data_dir: Path = Path(os.environ.get("DATA_DIR", str(_default_data_dir())))

    @property
    def sample_csv_path(self) -> Path:
        return self.data_dir / "sample-data.csv"


settings = Settings()
