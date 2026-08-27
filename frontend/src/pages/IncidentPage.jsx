import {
<<<<<<< HEAD
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
=======
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import IncidentFlowStepper
    from "../components/IncidentFlowStepper";

import IncidentSummaryCard
    from "../components/IncidentSummaryCard";

import IncidentTimeline
    from "../components/IncidentTimeline";

import InvestigationPanel
    from "../components/InvestigationPanel";

import EvidencePanel
    from "../components/EvidencePanel";

import RecommendationPanel
    from "../components/RecommendationPanel";

import OperatorDecisionPanel
    from "../components/OperatorDecisionPanel";

import {
    createOperatorDecision,
    getIncident,
    getIncidentEvidence,
    getIncidentReconstruction,
    investigateIncident,
    verifyEvidence
} from "../services/incidentService";

export default function IncidentPage({
    incident,
    history = [],
    token = "",
    onBack
}) {
    const [activeIncident, setActiveIncident] =
        useState(incident || null);

    const [reconstruction, setReconstruction] =
        useState(null);

    const [investigation, setInvestigation] =
        useState(null);

    const [evidence, setEvidence] =
        useState(null);

    const [verification, setVerification] =
        useState(null);

    const [tamperVerification, setTamperVerification] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [loadingIncident, setLoadingIncident] =
        useState(false);

    const [verifying, setVerifying] =
        useState(false);

    const [error, setError] =
        useState(null);

    const [currentStep, setCurrentStep] =
        useState("summary");

    const backendIncidentId = useMemo(() => {
        const raw =
            activeIncident?.id ??
            activeIncident?.incident_id;

        if (typeof raw === "number") {
            return raw;
        }

        if (typeof raw === "string") {
            if (/^\d+$/.test(raw.trim())) {
                return Number(raw);
            }

            const match =
                raw.trim().match(/^INC-(\d+)$/i);

            if (match) {
                return Number(match[1]);
            }
        }

        return null;
    }, [activeIncident]);

    useEffect(() => {
        let cancelled = false;

        async function loadIncidentContext() {
            if (!backendIncidentId) {
                return;
            }

            setLoadingIncident(true);
            setError(null);

            try {
                const [
                    backendIncident,
                    backendReconstruction
                ] = await Promise.all([
                    getIncident(
                        backendIncidentId,
                        token
                    ),
                    getIncidentReconstruction(
                        backendIncidentId,
                        token,
                        10,
                        5
                    )
                ]);

                if (cancelled) {
                    return;
                }

                setActiveIncident(
                    backendIncident
                );

                setReconstruction(
                    backendReconstruction
                );
            } catch (err) {
                if (cancelled) {
                    return;
                }

                setError(
                    err.message === "UNAUTHORIZED"
                        ? "Session expired. Please log in again."
                        : err.message
                );
            } finally {
                if (!cancelled) {
                    setLoadingIncident(false);
                }
            }
        }

        loadIncidentContext();

        return () => {
            cancelled = true;
        };
    }, [backendIncidentId, token]);

    useEffect(() => {
        setInvestigation(null);
        setEvidence(null);
        setVerification(null);
        setTamperVerification(null);
        setCurrentStep("summary");
    }, [backendIncidentId]);

    const handleInvestigate =
        useCallback(async () => {
            if (!activeIncident || !backendIncidentId) {
                setError(
                    "No valid backend incident selected."
                );
                return;
            }

            setLoading(true);
            setError(null);
            setCurrentStep("investigate");

            try {
                const result =
                    await investigateIncident(
                        activeIncident,
                        token
                    );

                setInvestigation(result);
                setCurrentStep("investigation");
            } catch (err) {
                setError(
                    err.message === "UNAUTHORIZED"
                        ? "Session expired. Please log in again."
                        : err.message
                );

                setCurrentStep("investigate");
            } finally {
                setLoading(false);
            }
        }, [
            activeIncident,
            backendIncidentId,
            token
        ]);

    const handleDecision =
        useCallback(async ({
            type,
            note
        }) => {
            if (!backendIncidentId) {
                throw new Error(
                    "No valid backend incident selected."
                );
            }

            setError(null);

            await createOperatorDecision(
                backendIncidentId,
                type,
                note,
                token
            );

            const generatedEvidence =
                await getIncidentEvidence(
                    backendIncidentId,
                    token
                );

            setEvidence(
                generatedEvidence
            );

            setVerification(null);
            setTamperVerification(null);
            setCurrentStep("decision");

            return generatedEvidence;
        }, [
            backendIncidentId,
            token
        ]);

    const handleVerify =
        useCallback(async () => {
            if (!evidence?.package ||
                !evidence?.sha256) {
                throw new Error(
                    "No evidence package is available."
                );
            }

            setVerifying(true);
            setError(null);

            try {
                const result =
                    await verifyEvidence(
                        evidence.package,
                        evidence.sha256,
                        token
                    );

                setVerification(result);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            } finally {
                setVerifying(false);
            }
        }, [
            evidence,
            token
        ]);

    const handleTamperTest =
        useCallback(async () => {
            if (!evidence?.package ||
                !evidence?.sha256) {
                throw new Error(
                    "No evidence package is available."
                );
            }

            setVerifying(true);
            setError(null);

            try {
                const tamperedPackage =
                    JSON.parse(
                        JSON.stringify(
                            evidence.package
                        )
                    );

                tamperedPackage.diagnosis =
                    "TAMPERED DEMO DATA";

                const result =
                    await verifyEvidence(
                        tamperedPackage,
                        evidence.sha256,
                        token
                    );

                setTamperVerification(
                    result
                );

                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            } finally {
                setVerifying(false);
            }
        }, [
            evidence,
            token
        ]);

    const timelineHistory =
        Array.isArray(
            reconstruction?.timeline
        )
            ? reconstruction.timeline
                .map(item => item?.telemetry)
                .filter(Boolean)
            : (
                Array.isArray(history)
                    ? history
                    : []
            );

    if (!activeIncident) {
        return (
            <div className="incident-page">
                <p>No incident selected.</p>

                <button
                    type="button"
                    onClick={onBack}
                >
                    ← Back to Mission Dashboard
                </button>
            </div>
        );
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166
    }

<<<<<<< HEAD
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
=======
    const effectiveStep =
        evidence
            ? "decision"
            : investigation
                ? "investigation"
                : currentStep;
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166

    return (
<<<<<<< HEAD
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
=======
        <div className="incident-page">

            <header className="incident-page-header">
                <button
                    type="button"
                    className="btn-back"
                    onClick={onBack}
                >
                    ← Back to Mission Dashboard
                </button>

                <h1>
                    MissionVault Sentinel
                </h1>
            </header>

            <IncidentFlowStepper
                currentStep={effectiveStep}
            />

            {loadingIncident && (
                <p className="muted">
                    Loading real incident data...
                </p>
            )}

            {error && (
                <section className="incident-error">
                    <strong>
                        Backend error
                    </strong>
                    <p>{error}</p>
                </section>
            )}

            <IncidentSummaryCard
                incident={activeIncident}
                onInvestigate={
                    handleInvestigate
                }
                investigating={loading}
            />

            <IncidentTimeline
                history={timelineHistory}
                incident={activeIncident}
            />

            <InvestigationPanel
                investigation={investigation}
                loading={loading}
                error={error}
            />

            <RecommendationPanel
                investigation={investigation}
            />

            <OperatorDecisionPanel
                investigation={investigation}
                onDecision={handleDecision}
            />

            <EvidencePanel
                incident={activeIncident}
                investigation={investigation}
                evidence={evidence}
                verification={verification}
                tamperVerification={
                    tamperVerification
                }
                verifying={verifying}
                onVerify={handleVerify}
                onTamperTest={
                    handleTamperTest
                }
            />

        </div>
    );
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166
}