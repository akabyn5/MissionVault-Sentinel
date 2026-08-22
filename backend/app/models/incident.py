# backend/app/models/incident.py

from sqlalchemy import Column, Integer, String
from app.database.database import Base


class Incident(Base):
    """
    Persistent database model for a mission incident.
    An incident is created when telemetry analysis identifies
    a significant anomaly requiring investigation.
    """

    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    satellite_id = Column(
        String,
        nullable=False,
        index=True
    )

    created_at = Column(
        String,
        nullable=False,
        index=True
    )

    severity = Column(
        String,
        nullable=False,
        default="normal",
        index=True
    )

    status = Column(
        String,
        nullable=False,
        default="open",
        index=True
    )

    primary_anomaly = Column(
        String,
        nullable=False,
        index=True
    )