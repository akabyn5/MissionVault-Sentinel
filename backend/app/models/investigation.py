# backend/app/models/investigation.py

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from app.database.database import Base


class Investigation(Base):
    """
    Persistent database model for AI-assisted incident investigation.
    """

    __tablename__ = "investigations"

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

    diagnosis = Column(
        Text,
        nullable=False
    )

    confidence = Column(
        Float,
        nullable=False
    )

    evidence = Column(
        Text,
        nullable=False,
        default="[]"
    )

    created_at = Column(
        String,
        nullable=False,
        index=True
    )