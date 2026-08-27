from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine
from app.database.migrate import (
    ensure_telemetry_midnight_columns,
)

from app.models.telemetry import TelemetryRecord
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.investigation import Investigation
from app.models.recommendation import Recommendation
from app.models.operator_decision import OperatorDecision

from app.routers.auth import router as auth_router
from app.routers.telemetry import router as telemetry_router
from app.routers.incidents import router as incidents_router
from app.routers.evidence import router as evidence_router


ensure_telemetry_midnight_columns(engine)

Base.metadata.create_all(
    bind=engine
)


app = FastAPI(
    title="MissionVault AI API",
    description=(
        "Backend API for secure satellite telemetry "
        "and anomaly detection"
    ),
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(telemetry_router)
app.include_router(incidents_router)
app.include_router(evidence_router)


@app.get("/")
def root():
    return {
        "message": "MissionVault AI Backend Running",
        "version": "0.1.0",
    }