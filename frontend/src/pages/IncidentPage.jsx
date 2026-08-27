import {
  useCallback,
  useEffect,
  useState,
} from "react";

import IncidentFlowStepper from "../components/IncidentFlowStepper";
import IncidentSummaryCard from "../components/IncidentSummaryCard";
import IncidentTimeline from "../components/IncidentTimeline";
import InvestigationPanel from "../components/InvestigationPanel";
import EvidencePanel from "../components/EvidencePanel";
import RecommendationPanel from "../components/RecommendationPanel";
import OperatorDecisionPanel from "../components/OperatorDecisionPanel";
import {
  investigateIncident,
  createOperatorDecision,
} from "../services/incidentService";

export default function IncidentPage({
  incident,
  history = [],
  token = "",
  onBack,
}) {
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState("summary");
  const [decisionError, setDecisionError] = useState(null);

  useEffect(() => {
    setInvestigation(null);
    setLoading(false);
    setError(null);
    setDecisionError(null);
    setCurrentStep("summary");
  }, [incident?.incident_id]);

  const handleInvestigate = useCallback(async () => {
    if (!incident) return;
    setLoading(true);
    setError(null);
    setCurrentStep("investigate");
    try {
      const result = await investigateIncident(incident, token);
      setInvestigation(result);
      setCurrentStep("investigation");
    } catch (err) {
      setError(
        err.message === "UNAUTHORIZED"
          ? "Session expired. Please log in again."
          : err.message || "Investigation request failed"
      );
      setCurrentStep("investigate");
    } finally {
      setLoading(false);
    }
  }, [incident, token]);

  const handleDecision = useCallback(
    async ({ type, note }) => {
      if (!incident) return;
      const incidentId = incident.incident_id || incident.id;
      setDecisionError(null);
      try {
        await createOperatorDecision(incidentId, type, note, token);
        setCurrentStep("decision");
      } catch (err) {
        setDecisionError(
          err.message === "UNAUTHORIZED"
            ? "Session expired. Please log in again."
            : err.message || "Failed to save the operator decision."
        );
        // Re-lanzamos el error para que OperatorDecisionPanel
        // también pueda mostrar su propio mensaje y no marque
        // la decisión como "recorded" si en realidad falló.
        throw err;
      }
    },
    [incident, token]
  );

  if (!incident) {
    return (
      <div className="incident-page">
        <p>No incident selected.</p>
        <button type="button" onClick={onBack}>
          ← Back to Mission Dashboard
        </button>
      </div>
    );
  }

  const effectiveStep =
    investigation && currentStep === "investigation"
      ? "investigation"
      : currentStep;

  return (
    <div className="incident-page">
      <header className="incident-page-header">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Back to Mission Dashboard
        </button>
        <h1>MissionVault Sentinel</h1>
      </header>

      <IncidentFlowStepper currentStep={effectiveStep} />

      <IncidentSummaryCard
        incident={incident}
        onInvestigate={handleInvestigate}
        investigating={loading}
      />

      <IncidentTimeline history={history} incident={incident} />

      <InvestigationPanel
        investigation={investigation}
        loading={loading}
        error={error}
      />

      <EvidencePanel
        incident={incident}
        investigation={investigation}
        historyCount={Array.isArray(history) ? history.length : 0}
      />

      <RecommendationPanel investigation={investigation} />

      {decisionError && <p className="error-box">{decisionError}</p>}

      <OperatorDecisionPanel
        investigation={investigation}
        onDecision={handleDecision}
      />
    </div>
  );
}