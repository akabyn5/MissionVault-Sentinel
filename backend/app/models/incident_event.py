# backend/app/models/incident_event.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.database.database import Base


class IncidentEvent(Base):
    """
    Persistent database model for telemetry events associated
    with a mission incident.
    """

    __tablename__ = "incident_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    incident_id = Column(
        Integer,
        ForeignKey("incidents.id"),
        nullable=False,
        index=True
    )

    timestamp = Column(
        String,
        nullable=False,
        index=True
    )

    metric = Column(
        String,
        nullable=False
    )

    value = Column(
        Float,
        nullable=False
    )

    event_type = Column(
        String,
        nullable=False,
        index=True
    )