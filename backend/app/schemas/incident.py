# backend/app/schemas/incident.py

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    """
    Request body for manually creating a mission incident.
    Automatic incident creation from telemetry does not require
    this schema.
    """

    satellite_id: str = Field(min_length=1)
    severity: str = Field(min_length=1)
    primary_anomaly: str = Field(min_length=1)


class InvestigationRequest(BaseModel):
    """
    Request body for starting an AI-assisted investigation.
    """

    force_refresh: bool = False


class DecisionRequest(BaseModel):
    """
    Request body for recording the human operator's decision.
    """

    decision: str = Field(min_length=1)
    note: str | None = None