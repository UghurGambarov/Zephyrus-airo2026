# Zephyrus City Trap

**AI-assisted cyber-threat detection for smart-city infrastructure, built on a deception grid.**

Zephyrus City Trap monitors the activity stream of smart-city devices (traffic
controllers, cameras, ATMs, SCADA/PLC units, city portals), detects anomalous
behaviour with machine learning, classifies threats, scores risk, maps findings
to MITRE ATT&CK, and produces analyst-ready incident reports. Around the real
devices it places realistic **decoys** — no legitimate user ever touches a decoy,
so every decoy hit is a near-zero-false-positive, high-confidence attack signal.

> The user-facing application (dashboard text, incident reports) is in
> **Azerbaijani**, the product's target locale. Code, configuration, and these
> docs are in English.

---

## Table of contents

- [Key features](#key-features)
- [Architecture overview](#architecture-overview)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development setup](#development-setup)
- [Environment variables](#environment-variables)
- [Build](#build)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Security & ethics](#security--ethics)
- [License](#license)

## Key features

- **Deception grid (5 decoys).** Fake traffic-light/SCADA controller, fake city
  portal login, canary token file, fake camera stream, and fake ATM. Any request
  to a decoy is treated as a high-confidence threat.
- **Layered AI detection.**
  1. **Detection (ML):** scikit-learn `IsolationForest` learns the "normal"
     traffic profile and flags anomalies, including previously unseen ones.
  2. **Classification & risk (hybrid ML + rules):** assigns a threat class, risk
     level (low/medium/high), and a MITRE ATT&CK label.
  3. **Reporting (optional LLM):** deterministic offline incident report by
     default; optionally enriched with Claude when an API key is present.
- **Interactive city map (SVG):** road network, building blocks, and parks with
  ~14 IoT devices placed at realistic locations, colour-coded live (green /
  amber / red) by current state.
- **Attack simulation:** a one-click, self-contained attack chain
  (recon → exploitation → brute force → exfiltration) that drives the live feed.
- **Log analysis center:** upload real corporate logs — Syslog (RFC 5424),
  Windows Event (EVTX/JSON), CEF/LEEF — and a client-side converter normalizes
  them into the engine's schema for forensic analysis.
- **Explainable alerts:** each event carries a 0–100 anomaly score, a
  human-readable reason, a MITRE label, and a recommended response playbook.

## Architecture overview

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
                       │  api → engine → store        │
                       └───┬───────────┬───────────┬──┘
            decoy traffic  │           │           │  uploaded / sample logs
                           ▼           ▼           ▼
                     ┌─────────┐ ┌──────────┐ ┌──────────────┐
                     │ decoys  │ │  engine  │ │ log_analyzer │
                     │ router  │ │ (ML+rule)│ │   (ingest)   │
                     └─────────┘ └────┬─────┘ └──────────────┘
                                      │
                                ┌─────▼─────┐   ┌──────────┐
                                │ in-memory │   │ report   │
                                │   store   │   │ (LLM opt)│
                                └───────────┘   └──────────┘
```

- **Detection engine** is the core: feature extraction → `IsolationForest`
  scoring → hybrid classification → incident report assembly.
- **Decoys, log ingestion, and the attack simulator** are three independent
  event sources that all feed the same engine, guaranteeing consistent scoring.
- **State is in-memory** (no database). It resets when the server restarts —
  appropriate for a single-node demo/MVP; see the [roadmap](#roadmap) for the
  persistence path.

## Technology stack

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Backend API      | Python 3.11+, FastAPI, Uvicorn (ASGI)                       |
| Machine learning | scikit-learn (`IsolationForest`), NumPy                     |
| Optional LLM     | Anthropic Claude (`claude-sonnet-4-6`) — offline-safe       |
| Frontend         | React 19, Vite, plain JavaScript                            |
| Log parsing      | Python stdlib `csv` (backend), client-side JS (frontend)    |
| Tooling          | ESLint (frontend); Ruff/pytest recommended (backend)        |

## Project structure

```
.
├── backend/                 # Python FastAPI service
│   ├── app/                 # application package
│   │   ├── api/             # route handlers (FastAPI routers)
│   │   ├── core/            # config, constants
│   │   ├── engine/          # ML detection + classification + reporting
│   │   ├── ingestion/       # log/CSV ingestion
│   │   ├── decoys/          # decoy endpoints
│   │   └── store/           # in-memory state
│   ├── scripts/             # dev tooling (sample-data generator, attacker)
│   ├── tests/               # backend tests
│   ├── pyproject.toml       # deps + tool config
│   └── .env.example
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── api/             # backend client
│   │   ├── components/      # UI components
│   │   ├── features/        # city map, feed, report, log-center, simulation
│   │   └── lib/             # log converter, helpers
│   ├── public/
│   └── package.json
├── data/                    # sample datasets
├── docs/                    # architecture & reference docs
├── scripts/                 # repo-level scripts (run-dev, diagram gen)
├── PROJECT_OVERVIEW.md      # non-technical stakeholder overview
└── README.md
```

## Prerequisites

- **Python** 3.11 or newer
- **Node.js** 18 or newer (and npm)
- A POSIX shell or PowerShell

## Installation

```bash
# 1. Backend
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Unix:     source .venv/bin/activate
pip install -e .            # or: pip install -r requirements.txt

# 2. Frontend
cd ../frontend
npm install
```

## Development setup

Run the backend and frontend in two terminals.

```bash
# Terminal 1 — backend (http://127.0.0.1:8010)
cd backend
uvicorn app.main:app --reload --port 8010

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Then open <http://localhost:5173>.

**Trigger an attack simulation** from the dashboard (**🔴 Start Attack**) or via
the API: `POST /api/simulate-attack`.

## Environment variables

All backend configuration is read from the environment. Copy
[`backend/.env.example`](backend/.env.example) to `backend/.env`. The frontend
reads [`frontend/.env.example`](frontend/.env.example) at build time.

| Variable             | Required | Default                   | Description                                                        |
| -------------------- | -------- | ------------------------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | No       | _(unset)_                 | Enables Claude-generated incident reports. Falls back to template. |
| `PORT`               | No       | `8010`                    | Backend listen port.                                               |
| `CORS_ALLOW_ORIGINS` | No       | `http://localhost:5173`   | Comma-separated allowed origins. **Do not use `*` in production.** |

Frontend build-time variables (Vite, `VITE_` prefix):

| Variable           | Default                   | Description              |
| ------------------ | ------------------------- | ------------------------ |
| `VITE_BACKEND_URL` | `http://127.0.0.1:8010`   | Backend base URL.        |

## Build

```bash
# Frontend production bundle → frontend/dist
cd frontend
npm run build
npm run preview   # serve the built bundle locally
```

The backend is served directly with Uvicorn/Gunicorn; there is no build step.

## Deployment

A typical single-node deployment:

1. **Backend** — run Uvicorn behind a process manager / reverse proxy:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8010 --workers 2
   ```
   Set `CORS_ALLOW_ORIGINS` to the deployed frontend origin and provide secrets
   via the environment (never commit `.env`).
2. **Frontend** — `npm run build` and serve `frontend/dist` from any static host
   (Nginx, CDN, Vercel, Netlify) with `VITE_BACKEND_URL` pointing at the backend.

> Because state is in-memory, run a **single backend worker/instance** until a
> shared persistence layer is introduced (see [roadmap](#roadmap)).

## API reference

| Method | Path                       | Description                                       |
| ------ | -------------------------- | ------------------------------------------------- |
| GET    | `/api/state`               | Full current state (polled by the frontend).      |
| POST   | `/api/simulate-attack`     | Run the live attack simulation.                   |
| POST   | `/api/analyze-logs`        | Analyze the bundled sample CSV.                   |
| POST   | `/api/analyze-upload`      | Analyze uploaded (converted) log rows.            |
| POST   | `/api/report/{id}/ai`      | Generate an (optional) Claude incident report.    |
| POST   | `/api/reset`               | Clear all events and alerts.                      |
| GET    | `/decoy/...`               | Decoy endpoints (any hit raises a high alert).    |

Interactive API docs are available at `/docs` when the backend is running.

## Contributing

1. Create a feature branch from `main`.
2. Keep code and comments in **English**; keep user-facing strings in
   **Azerbaijani** (the product locale) and avoid hardcoding them in logic.
3. Run linters/tests before opening a PR:
   ```bash
   cd frontend && npm run lint
   cd backend  && ruff check . && pytest
   ```
4. Write a clear PR description and link any related issue.
5. One logical change per PR; include tests for backend behaviour changes.

## Roadmap

- **Persistence** — replace in-memory store with a database (PostgreSQL/SQLite)
  to survive restarts and enable horizontal scaling.
- **Real-time transport** — replace 1s polling with WebSocket push.
- **Device log agents** — passive log ingestion from real devices.
- **More decoy templates** — PLC, IoT gateway, smart meter.
- **More log formats** — Zeek, Suricata EVE, AWS CloudTrail, with server-side parsing.
- **Per-site model tuning** — learn each site's "normal" from its own history.
- **Multi-tenant console** — central management across multiple sites.
- **Authentication & RBAC** — operator login and role-based access.

## Security & ethics

This is a **defensive** security tool. Everything runs in an isolated local
environment; it does not attack any real system, network, or third party. The
bundled "attacker" is a self-contained simulation targeting only `127.0.0.1`.
Decoys contain **synthetic data only** — no real citizen information. A
human-in-the-loop model is preserved: the AI prepares reports, a human analyst
makes the final decision.

## License

Add a `LICENSE` file before public release (e.g. MIT or Apache-2.0) and
reference it here.
