# backend/app/routers/incidents.py

from fastapi import APIRouter, HTTPException

from app.services.incident_service import (
    get_all_incidents,
    get_incident,
)


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


@router.get("")
def list_incidents():
    """Return all mission incidents."""
    return get_all_incidents()


@router.get("/{incident_id}")
def read_incident(incident_id: int):
    """Return one mission incident."""
    incident = get_incident(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident