import { useState } from "react";
import { getIncidentEvidence, verifyEvidence } from "../services/incidentService";

function extractPackage(data) {
  return data?.evidence_package ?? data?.package ?? data ?? null;
}

function extractSha256(data) {
  return (
    data?.sha256 ??
    data?.evidence_sha256 ??
    data?.fingerprint ??
    data?.hash ??
    null
  );
}

function extractValidity(result) {
  if (typeof result?.valid === "boolean") return result.valid;
  if (typeof result?.match === "boolean") return result.match;
  if (typeof result?.is_valid === "boolean") return result.is_valid;
  return null;
}

export default function EvidencePanel({ incident, investigation, historyCount = 0 }) {
  const [evidencePackage, setEvidencePackage] = useState(null);
  const [sha256, setSha256] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  if (!investigation) {
    return (
      <section className="evidence-panel idle">
        <h2>Evidence</h2>
        <p className="muted">Evidence will appear after the investigation runs.</p>
      </section>
    );
  }

  const incidentId = incident?.incident_id || incident?.id;

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const data = await getIncidentEvidence(incidentId);
      setEvidencePackage(extractPackage(data));
      setSha256(extractSha256(data));
    } catch (err) {
      setGenerateError(
        err.message === "UNAUTHORIZED"
          ? "Session expired. Please log in again."
          : err.message || "Failed to generate the evidence package."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleVerify() {
    if (!evidencePackage || !sha256) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const result = await verifyEvidence(evidencePackage, sha256);
      setVerifyResult(extractValidity(result));
    } catch (err) {
      setVerifyError(
        err.message === "UNAUTHORIZED"
          ? "Session expired. Please log in again."
          : err.message || "Failed to verify the evidence package."
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="evidence-panel">
      <div className="section-header">
        <h2>Evidence Package</h2>
      </div>

      <div className="evidence-grid">
        <div className="evidence-field">
          <span className="field-label">Incident</span>
          <p className="field-value">{incidentId || "—"}</p>
        </div>
        <div className="evidence-field">
          <span className="field-label">Satellite</span>
          <p className="field-value">{incident?.satellite_id || "—"}</p>
        </div>
        <div className="evidence-field">
          <span className="field-label">Severity</span>
          <p className="field-value">{incident?.severity || "—"}</p>
        </div>
        <div className="evidence-field">
          <span className="field-label">Telemetry packets</span>
          <p className="field-value">{historyCount}</p>
        </div>
      </div>

      {!evidencePackage && (
        <button
          type="button"
          className="btn-generate-evidence"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Generating..." : "GENERATE EVIDENCE PACKAGE"}
        </button>
      )}

      {generateError && <p className="error-box">{generateError}</p>}

      {sha256 && (
        <div className="evidence-fingerprint">
          <span className="field-label">SHA-256 FINGERPRINT</span>
          <p className="field-value mono">{sha256}</p>
        </div>
      )}

      {evidencePackage && (
        <button
          type="button"
          className="btn-verify-evidence"
          onClick={handleVerify}
          disabled={verifying}
        >
          {verifying ? "Verifying..." : "VERIFY EVIDENCE"}
        </button>
      )}

      {verifyError && <p className="error-box">{verifyError}</p>}

      {verifyResult === true && (
        <p className="verify-result valid">✓ VALID</p>
      )}
      {verifyResult === false && (
        <p className="verify-result mismatch">✕ INTEGRITY MISMATCH</p>
      )}
    </section>
  );
}