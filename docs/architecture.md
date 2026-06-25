# Architecture

This document describes the technical architecture of Zephyrus City Trap for
developers. For a business-oriented overview see
[`PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md).

## High-level diagram

```
                       ┌─────────────────────────────┐
                       │        Frontend (React)      │
                       │  SOC console · SVG city map  │
                       │  log converter (client-side) │
                       └───────────────┬──────────────┘
                                       │ HTTP (poll /api/state every 1s)
                                       ▼
                       ┌─────────────────────────────┐
                       │       Backend (FastAPI)      │
                       │       app.api routers        │
                       └───┬───────────┬───────────┬──┘
            decoy traffic  │           │           │  uploaded / sample logs
                           ▼           ▼           ▼
                     ┌─────────┐ ┌──────────┐ ┌──────────────┐
                     │ decoys  │ │  engine  │ │  ingestion   │
                     │ router  │ │(ML+rules)│ │   (logs)     │
                     └────┬────┘ └────┬─────┘ └──────┬───────┘
                          └───────────┼──────────────┘
                                      ▼
                                ┌───────────┐
                                │   store   │  in-memory state
                                └───────────┘
```

## Backend packages

| Package            | Responsibility                                                        |
| ------------------ | --------------------------------------------------------------------- |
| `app.core`         | Env-driven `config` and shared `constants` (risk levels, decoy map).  |
| `app.engine`       | Detection core: `features` → `model` → `classify` → `report`, tied together by `detector.build_alert`. |
| `app.ingestion`    | Turns CSV / uploaded rows into events and runs them through the engine. |
| `app.simulation`   | Server-side attack sequence injected into the engine.                 |
| `app.decoys`       | Decoy HTTP endpoints; any hit is a high-confidence alert.             |
| `app.store`        | Single in-memory state container (the DB-replacement point).          |
| `app.api`          | Thin FastAPI routers that delegate to the packages above.            |

### Detection pipeline (`app.engine`)

1. **`features.extract_features`** — derive a 4-number vector
   (`hour`, `last_minute`, `distinct_devices`, `failed`) plus an `info` dict.
2. **`model.score_anomaly`** — `IsolationForest` (trained once at import on a
   synthetic baseline) scores the vector; calibrated to 0–100 via z-score.
3. **`classify.classify_stream`** — hybrid rules + score assign threat class,
   MITRE label, and risk (`high`/`medium`/`low`).
4. **`report.template_report`** — deterministic Azerbaijani incident report;
   `report.ai_report` optionally enriches it with Claude.

`detector.build_alert` orchestrates these and is the single entry point used by
decoys, ingestion, and simulation — guaranteeing consistent scoring.

## API contract

Wire keys are **English**; user-facing string *values* are Azerbaijani (the
product locale). Risk is the enum `high` / `medium` / `low`; the frontend maps
it to localized labels in `src/lib/format.js`.

See the [API reference](../README.md#api-reference) for the endpoint list.

## Frontend structure

| Path                     | Responsibility                                  |
| ------------------------ | ----------------------------------------------- |
| `src/api/client.js`      | Backend client; base URL from `VITE_BACKEND_URL`. |
| `src/lib/`               | `logConverter` (Syslog/Windows/CEF) and `format` helpers. |
| `src/components/`        | Small shared presentational primitives.         |
| `src/features/city-map/` | SVG city map + layout/state derivation.         |
| `src/features/alert-feed/` | Center alert feed + pagination.               |
| `src/features/incident-report/` | Right-hand incident report panel.        |
| `src/features/simulation/` | Attack-story modal + narrative.               |
| `src/features/log-center/` | Log upload + conversion modal.                |
| `src/App.jsx`            | Composition root (state + layout only).         |

## State & scaling

State is in-memory and resets on restart. Run a **single backend instance**
until a shared persistence layer replaces `app.store`. The store interface
(`add_event`, `add_alert`, `get_state`, `reset`, `snapshot_events`) is the only
surface a database implementation needs to satisfy.

## Regenerating the architecture diagram

```bash
python scripts/gen_architecture_diagram.py   # requires matplotlib
```
