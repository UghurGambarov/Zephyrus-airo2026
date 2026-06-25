"""Detection engine — the core of Zephyrus City Trap.

Layered AI:
  1. Detection (ML): IsolationForest learns the normal traffic profile and
     scores anomalies.
  2. Classification & risk (hybrid ML + rules): threat class, risk level, MITRE.
  3. Reporting (optional LLM): deterministic offline report, optionally enriched
     with Claude.
"""

from app.engine.detector import build_alert

__all__ = ["build_alert"]
