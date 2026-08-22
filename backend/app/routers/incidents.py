# backend/app/routers/incidents.py

from fastapi import APIRouter, HTTPException, Query

from app.services.incident_service import (
    get_all_incidents,
    get_incident,
    reconstruct_incident,
)


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


@router.get("")
def list_incidents():
    """
    Return all mission incidents.
    """
    return get_all_incidents()


@router.get("/{incident_id}")
def read_incident(
    incident_id: int,
    include_reconstruction: bool = Query(
        default=True
    ),
):
    """
    Return one incident.

    By default, the response includes the telemetry
    reconstruction around the incident.
    """

    incident = get_incident(
        incident_id=incident_id,
        include_reconstruction=include_reconstruction,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident


@router.get("/{incident_id}/reconstruction")
def read_incident_reconstruction(
    incident_id: int,
    before: int = Query(
        default=10,
        ge=0,
        le=100,
    ),
    after: int = Query(
        default=5,
        ge=0,
        le=100,
    ),
):
    """
    Return the telemetry context around an incident.
    """

    reconstruction = reconstruct_incident(
        incident_id=incident_id,
        before=before,
        after=after,
    )

    if reconstruction is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return reconstruction