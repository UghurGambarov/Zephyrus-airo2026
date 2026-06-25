"""ML anomaly model: IsolationForest trained on a synthetic "normal" baseline.

The model is trained once at import time. Scores are calibrated to a 0-100
scale using how many standard deviations below the normal mean a point falls
(an explainable z-score approach). Everything runs locally — no internet needed.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def _normal_baseline(n: int = 800) -> np.ndarray:
    """Generate a realistic, continuous "normal" smart-city traffic cloud.

    Normal data must be continuous and tailed (occasionally a legitimate user
    sends a few more requests) so the model can separate "slightly unusual" from
    "very unusual".
    """
    rng = np.random.default_rng(42)
    hour = np.clip(rng.normal(14, 3, n), 0, 23)             # around work hours
    last_minute = np.clip(rng.poisson(1.5, n) + 1, 1, 12)   # mostly low, rarely high
    distinct_devices = np.clip(rng.poisson(0.4, n) + 1, 1, 6)
    failed = (rng.random(n) < 0.03).astype(float)           # ~3% failed attempts
    return np.column_stack([hour, last_minute, distinct_devices, failed])


# Scale features first: "hour" (0-23) spans a much wider range than the others,
# so without scaling the model would mostly look at the hour.
_BASELINE = _normal_baseline()
_MODEL = make_pipeline(
    StandardScaler(),
    IsolationForest(n_estimators=200, contamination=0.02, random_state=42),
).fit(_BASELINE)

# Calibration: mean/std of the model's decision function on normal data.
_DECISION_NORMAL = _MODEL.decision_function(_BASELINE)
_MU = float(_DECISION_NORMAL.mean())
_SD = float(_DECISION_NORMAL.std()) or 1e-6

# Points per standard deviation: ~4.5 std below = 100 points.
_SCORE_FACTOR = 22


def _to_0_100(decision_value: float) -> int:
    """Convert a decision_function value to a 0-100 anomaly score (z-score)."""
    z = (_MU - decision_value) / _SD  # std deviations BELOW the normal mean
    return int(max(0, min(100, round(z * _SCORE_FACTOR))))


def score_anomaly(vector) -> int:
    """Compute the 0-100 anomaly score for a feature vector."""
    x = np.array([vector], dtype=float)
    d = float(_MODEL.decision_function(x)[0])
    return _to_0_100(d)
