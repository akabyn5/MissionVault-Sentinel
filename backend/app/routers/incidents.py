# backend/app/routers/incidents.py

from fastapi import APIRouter, HTTPException, Query

from app.schemas.incident import (
    DecisionRequest,
    IncidentCreate,
    InvestigationRequest,
)

from app.services.decision_service import (
    create_operator_decision,
)

from app.services.incident_service import (
    get_all_incidents,
    get_incident,
    manually_create_incident,
    reconstruct_incident,
)

from app.services.investigation_service import (
    create_initial_investigation,
    get_investigation,
)


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


# ---------------------------------------------------------
# POST /incidents
# ---------------------------------------------------------

@router.post("")
def create_incident_endpoint(
    payload: IncidentCreate,
):
    """
    Manually create a mission incident.

    Automatic telemetry-driven incident creation remains
    handled by the telemetry pipeline.
    """

    return manually_create_incident(
        satellite_id=payload.satellite_id,
        severity=payload.severity,
        primary_anomaly=payload.primary_anomaly,
    )


# ---------------------------------------------------------
# GET /incidents
# ---------------------------------------------------------

@router.get("")
def list_incidents():
    """
    Return all mission incidents.
    """

    return get_all_incidents()


# ---------------------------------------------------------
# GET /incidents/{incident_id}
# ---------------------------------------------------------

@router.get("/{incident_id}")
def read_incident(
    incident_id: int,
    include_reconstruction: bool = Query(
        default=True
    ),
):
    """
    Return one incident.

    By default, telemetry reconstruction is included.
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


# ---------------------------------------------------------
# GET /incidents/{incident_id}/reconstruction
# ---------------------------------------------------------

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
    Return telemetry surrounding an incident.
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


# ---------------------------------------------------------
# POST /incidents/{incident_id}/investigate
# ---------------------------------------------------------

@router.post("/{incident_id}/investigate")
def investigate_incident(
    incident_id: int,
    payload: InvestigationRequest,
):
    """
    Start an investigation for an incident.

    This currently uses the deterministic investigation
    foundation. Gemini integration will replace this
    implementation in the next step.
    """

    incident = get_incident(
        incident_id=incident_id,
        include_reconstruction=False,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    if not payload.force_refresh:
        existing = get_investigation(
            incident_id=incident_id
        )

        if existing is not None:
            return {
                "message": "Existing investigation returned",
                "investigation": existing,
            }

    investigation = create_initial_investigation(
        incident_id=incident_id
    )

    if investigation is None:
        raise HTTPException(
            status_code=500,
            detail="Unable to create investigation",
        )

    return {
        "message": "Investigation created",
        "investigation": investigation,
    }


# ---------------------------------------------------------
# POST /incidents/{incident_id}/decision
# ---------------------------------------------------------

@router.post("/{incident_id}/decision")
def record_incident_decision(
    incident_id: int,
    payload: DecisionRequest,
):
    """
    Record the human operator's decision for an incident.
    """

    result = create_operator_decision(
        incident_id=incident_id,
        decision=payload.decision,
        note=payload.note,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return {
        "message": "Operator decision recorded",
        "decision": result,
    }