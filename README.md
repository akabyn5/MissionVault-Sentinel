🚀 MissionVault AI
> AI-powered confidential satellite mission control built with Midnight blockchain.
MissionVault AI is an intelligent mission-operations platform that combines rule-based AI anomaly detection with confidential data anchoring on Midnight. It provides secure telemetry storage, real-time health monitoring, searchable mission history, and a privacy-aware operator dashboard—without relying solely on centralized databases.
Unlike traditional mission-control systems that keep sensitive telemetry only in central stores, MissionVault AI can optionally anchor cryptographic commitments of telemetry packets to Midnight. Operators still get full visibility and analytics, while the integrity and confidentiality properties of the chain help protect mission-critical data.
---
🌌 Inspiration
Modern satellites generate continuous streams of telemetry: battery state of charge, thermal conditions, RF link quality, CPU load, payload status, and more. Traditional architectures often place this data in centralized databases, creating risks around unauthorized access, tampering, and single points of failure.
MissionVault AI was built to answer a practical question:
How can satellite operators use AI-assisted monitoring without sacrificing the confidentiality and integrity of mission-critical data?
By pairing local AI analysis with Midnight’s confidential smart-contract capabilities (via commitment anchoring), the platform supports secure, intelligent, and privacy-preserving mission operations—especially relevant for CubeSats, university research missions, and commercial operators who need both insight and protection.
---
✨ Features
Category	Capabilities
Confidential storage	Local SQLite persistence + optional Midnight commitment anchoring
AI / anomaly detection	Rule-based analysis for battery, temperature, signal, CPU, and payload
Real-time monitoring	Live dashboard with auto-refresh (~5 s)
Mission dashboard	Status, latest packet, statistics, health metrics, trends, alerts
Telemetry visualization	Chart.js time-series for battery, temperature, CPU, signal
Search & filters	Query by satellite ID and severity (normal / warning / critical)
Authentication	JWT-based operator login (demo credentials configurable via env)
API	FastAPI REST endpoints with OpenAPI docs
Simulator	Realistic CubeSat telemetry generator with occasional anomalies
Privacy-first design	Local-first; Midnight can be enabled without changing the core flow
---
🏗 Architecture
```
                    ┌─────────────────────┐
                    │  Telemetry Simulator │
                    │  (SD-CUBESAT-001)    │
                    └──────────┬──────────┘
                               │ POST /telemetry
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Auth (JWT)  │  │ Analysis Service │  │ Telemetry Svc   │  │
│  └─────────────┘  └────────┬─────────┘  └────────┬────────┘  │
│                            │                     │           │
│                            ▼                     ▼           │
│                   Rule-based alerts      SQLite (telemetry)  │
│                                              │               │
│                                              ▼               │
│                                    Midnight Service          │
│                              (optional commitment anchor)    │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ REST (Bearer token)
                               ▼
                    ┌─────────────────────┐
                    │  React + Vite UI    │
                    │  Login · Dashboard  │
                    │  Charts · Search    │
                    └─────────────────────┘
```
High-level flow
The simulator (or a real source) posts telemetry packets to `POST /telemetry`.
The analysis service evaluates thresholds and produces severity + alerts.
The telemetry service persists the packet and analysis in SQLite.
Optionally, a SHA-256 commitment of the packet is anchored via the Midnight bridge endpoint.
Authenticated operators load the dashboard (`GET /telemetry/dashboard`) for status, metrics, trends, charts, and recent alerts.
Operators can search historical telemetry by satellite ID and severity.
---
🧠 How It Works
Ingest — Telemetry arrives as JSON (`satellite_id`, `battery`, `temperature`, `signal_strength`, `cpu_load`, `payload_status`, `timestamp`).
Analyze — Rule-based checks assign `normal` / `warning` / `critical` and build human-readable alert messages.
Persist — Full packet + analysis + Midnight receipt fields are stored in SQLite.
Anchor (optional) — When `MIDNIGHT_ENABLED=true` and an anchor URL is configured, a commitment is posted to the Midnight integration endpoint.
Operate — The React dashboard polls protected endpoints every 5 seconds and renders mission status, latest telemetry (including Midnight metadata), statistics, health metrics, charts, trends, alerts, and search results.
Anomaly rules (summary)
Metric	Warning	Critical
Battery	≤ 40%	< 20%
Temperature	≥ 60 °C	> 80 °C
Signal strength	≤ −90 dBm	< −100 dBm
CPU load	≥ 80%	> 95%
Payload status	—	`ERROR`
---
💡 Example Use Cases
CubeSat and university research mission operations
Educational satellite programs and student aerospace teams
Commercial operators needing integrity-aware telemetry archives
Prototyping privacy-preserving space data pipelines with Midnight
Demo and training environments for secure mission control
---
🛠 Tech Stack
Backend
Python 3 · FastAPI · Uvicorn
SQLAlchemy 2 · SQLite
Pydantic · python-jose (JWT) · requests
Optional: Midnight commitment anchoring via HTTP bridge
Frontend
React 18 · Vite
Chart.js / `react-chartjs-2`
JWT auth stored in `localStorage`
Polling-based real-time dashboard
AI / Analytics
Rule-based anomaly detection (extensible toward predictive models)
Aggregations: counts by severity, min/avg/max health metrics, first→latest trends, mission duration & packet rates
Blockchain
Midnight (optional)
SHA-256 commitment of telemetry + analysis payload
Configurable network, contract address, and anchor URL
Local-only mode when Midnight is disabled
Tooling
Telemetry simulator with realistic drift and periodic anomaly injection
CORS configured for the Vite dev server (`http://localhost:5173`)
---
📂 Project Structure
```
MISSIONVAULT-AI/
├── .github/workflows/          # CI workflows
├── assets/                     # Screenshots, architecture diagrams, branding
├── backend/
│   └── app/
│       ├── database/
│       │   └── database.py     # SQLAlchemy engine & SessionLocal
│       ├── models/
│       │   └── telemetry.py    # TelemetryRecord (+ Midnight columns)
│       ├── routers/
│       │   ├── auth.py         # /auth/login, /auth/me
│       │   └── telemetry.py    # Telemetry & dashboard endpoints
│       ├── schemas/
│       │   ├── auth.py
│       │   └── telemetry.py
│       ├── services/
│       │   ├── analysis_service.py
│       │   ├── auth_service.py
│       │   ├── midnight_service.py
│       │   ├── statistics_service.py   # (if present)
│       │   ├── search_service.py       # (if present)
│       │   └── telemetry_service.py
│       ├── main.py
│       └── requirements.txt
├── contracts/                  # Midnight contract notes / README
├── docs/                       # Architecture notes & diagrams
├── frontend/
│   ├── src/
│   │   ├── components/         # Status, charts, filters, alerts, etc.
│   │   ├── pages/              # Login.jsx, Dashboard.jsx
│   │   ├── services/           # authService.js, dashboardService.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── frontend_old/               # Previous frontend (reference)
├── simulator/
│   └── telemetry_generator.py
├── .env                        # Example Midnight / app config
├── LICENSE
└── README.md
```
---
🚀 Getting Started
Prerequisites
Python 3.10+ (recommended)
Node.js 18+ and npm
Git
1. Clone the repository
```bash
git clone https://github.com/yourusername/MissionVault-AI.git
cd MissionVault-AI
```
2. Backend setup
```bash
cd backend
python -m venv .venv
# Linux / macOS
source .venv/bin/activate
# Windows
# .venv\Scripts\activate

pip install -r app/requirements.txt
# or, if your tree places requirements at backend/requirements.txt:
# pip install -r requirements.txt
```
Optional environment variables (see also root `.env`):
Variable	Default	Purpose
`MISSIONVAULT_SECRET_KEY`	`change-this-secret-key`	JWT signing key
`MISSIONVAULT_TOKEN_EXPIRE_MINUTES`	`1440`	Token lifetime
`MISSIONVAULT_DEMO_USERNAME`	`operator`	Demo login user
`MISSIONVAULT_DEMO_PASSWORD`	`SpaceDogs2026`	Demo login password
`MIDNIGHT_ENABLED`	`false`	Enable chain anchoring
`MIDNIGHT_NETWORK`	`preprod`	Target network label
`MIDNIGHT_CONTRACT_ADDRESS`	(empty)	Contract address
`MIDNIGHT_ANCHOR_URL`	(empty)	Bridge endpoint for commitments
`MISSIONVAULT_API_URL`	`http://127.0.0.1:8000/telemetry`	Simulator target
Run the API:
```bash
python -m uvicorn app.main:app --reload
```
API root: http://127.0.0.1:8000
Interactive docs: http://127.0.0.1:8000/docs
3. Telemetry simulator
From the repository root (with the backend running):
```bash
python -m simulator.telemetry_generator
```
The simulator posts a packet every ~5 seconds for satellite `SD-CUBESAT-001`, with occasional injected anomalies (temperature, battery, signal, CPU, or payload).
4. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the Vite app (typically http://localhost:5173).
Demo credentials (unless overridden by env):
Username: `operator`
Password: `SpaceDogs2026`
---
📡 API Overview
Public / lightly protected:
Method	Path	Description
`GET`	`/`	Health / version message
`GET`	`/health`	Service health
`POST`	`/telemetry`	Ingest a telemetry packet (no auth; used by simulator)
`POST`	`/auth/login`	Obtain JWT
`GET`	`/auth/me`	Current user (Bearer)
Protected (Bearer JWT required):
Method	Path	Description
`GET`	`/telemetry`	All records
`GET`	`/telemetry/latest`	Newest packet
`GET`	`/telemetry/stats`	Counts by severity
`GET`	`/telemetry/metrics`	Min / avg / max health metrics
`GET`	`/telemetry/time`	Mission duration & rates
`GET`	`/telemetry/summary`	Combined summary
`GET`	`/telemetry/trends`	First→latest trend labels
`GET`	`/telemetry/anomalies`	All anomalous packets
`GET`	`/telemetry/severity/{level}`	Filter by severity
`GET`	`/telemetry/satellite/{id}`	Filter by satellite
`GET`	`/telemetry/search`	Query params: `satellite_id`, `severity`, `limit`
`GET`	`/telemetry/dashboard`	Full dashboard payload
---
🔐 Authentication
Demo operator is configured via environment variables (see table above).
Passwords are hashed with PBKDF2-HMAC-SHA256 (demo salt); production deployments should replace the demo user store and secret key.
Frontend stores the access token in `localStorage` under `missionvault_access_token` and sends `Authorization: Bearer <token>` on protected calls.
Unauthorized responses trigger logout on the dashboard.
---
⛓️ Midnight Integration
Anchoring is optional and designed as a safe boundary:
A canonical JSON of the telemetry + analysis is hashed with SHA-256 → `commitment`.
If `MIDNIGHT_ENABLED=true` and `MIDNIGHT_ANCHOR_URL` is set, the commitment (and payload metadata) is POSTed to the bridge.
Receipt fields (`status`, `tx_hash`, `network`, `contract_address`, `error`, etc.) are stored on the telemetry row and shown on the dashboard.
If Midnight is disabled or the URL is missing, the system stays local-only and continues normal operation.
This keeps development and demos simple while allowing a path to confidential on-chain commitments.
---
🔍 Future Improvements
Predictive maintenance and richer ML models
Multi-satellite fleet management
Orbital / 3D visualization
Role-based access control beyond the demo operator
End-to-end encrypted operator channels
Digital twin simulations
Autonomous planning assist
Mobile mission-control client
Hardened production auth (real user store, stronger secrets, rotation)
Deeper Midnight contract integration and audit trails
---
🌍 Impact
MissionVault AI aims to support:
More secure space operations and telemetry integrity
Privacy-preserving infrastructure patterns for aerospace data
AI-assisted decision support for operators
Democratization of satellite operations for students and small teams
Reproducible, open tooling for confidential mission data experiments
---
👥 Team
Space Dogs  
A student-led aerospace organization from Panama dedicated to democratizing access to space technologies through research, open-source development, and international collaboration.
---
📜 License
MIT License — see LICENSE.
---
❤️ Built For
Midnight Hackathon
Combining Artificial Intelligence + Confidential Blockchain + Space Technology to explore the next generation of secure mission-control systems.