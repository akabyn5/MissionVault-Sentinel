# backend/app/models/operator_decision.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database.database import Base


class OperatorDecision(Base):
    """
    Persistent database model for the final human operator
    decision associated with an incident.
    """

    __tablename__ = "operator_decisions"

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

    decision = Column(
        String,
        nullable=False
    )

    note = Column(
        Text,
        nullable=True
    )

    timestamp = Column(
        String,
        nullable=False,
        index=True
    )