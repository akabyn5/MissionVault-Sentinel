function formatConfidence(value) {
  const pct = Math.round((value || 0) * 100);
  return `${pct}%`;
}

function formatCreatedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }) + " UTC";
}

export default function InvestigationPanel({ investigation, loading, error }) {
  if (loading) {
    return (
      <section className="investigation-panel loading">
        <h2>AI Investigation</h2>
        <div className="loading-steps">
          <p className="loading-step">Analyzing incident telemetry...</p>
          <p className="loading-step">Reconstructing evidence...</p>
          <p className="loading-step">Generating investigation...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="investigation-panel error">
        <h2>AI Investigation</h2>
        <div className="error-box">
          <strong>Investigation failed</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!investigation) {
    return (
      <section className="investigation-panel idle">
        <h2>AI Investigation</h2>
        <p className="muted">
          Press <strong>INVESTIGATE</strong> to run the AI-assisted analysis.
        </p>
      </section>
    );
  }

  const confidenceLabel = formatConfidence(investigation.confidence);
  const confidencePct = Math.round((investigation.confidence || 0) * 100);
  const evidenceList = Array.isArray(investigation.evidence) ? investigation.evidence : [];
  const actionsList = Array.isArray(investigation.recommended_actions)
    ? investigation.recommended_actions
    : [];

  return (
    <section className="investigation-panel">
      <div className="section-header">
        <h2>AI Investigation</h2>
        <span className="source-badge">BACKEND</span>
      </div>

      <div className="investigation-grid">
        <div className="investigation-field diagnosis">
          <span className="field-label">Most likely explanation</span>
          <p className="field-value large">{investigation.diagnosis || "No diagnosis provided."}</p>
        </div>

        <div className="investigation-field confidence">
          <span className="field-label">Confidence</span>
          <p className="field-value large">{confidenceLabel}</p>
          <div className="confidence-bar">
            <div className="confidence-fill" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>

        <div className="investigation-field evidence-list">
          <span className="field-label">Supporting evidence</span>
          {evidenceList.length > 0 ? (
            <ol>
              {evidenceList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <p className="muted">No supporting evidence provided.</p>
          )}
        </div>

        <div className="investigation-field actions">
          <span className="field-label">Recommended actions</span>
          {actionsList.length > 0 ? (
            <ol>
              {actionsList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <p className="muted">No recommended actions provided.</p>
          )}
        </div>

        <div className="investigation-field risk">
          <span className="field-label">Operational risk</span>
          <p className="field-value">{investigation.risk || "Unknown"}</p>
        </div>

        <div className="investigation-field uncertainty">
          <span className="field-label">Uncertainty</span>
          <p className="field-value">{investigation.uncertainty || "Not specified"}</p>
        </div>

        <div className="investigation-field created-at">
          <span className="field-label">Generated at</span>
          <p className="field-value">{formatCreatedAt(investigation.created_at)}</p>
        </div>
      </div>

      {investigation.human_review_required !== false && (
        <div className="human-review-banner">
          <strong>HUMAN REVIEW REQUIRED</strong>
          <p>AI provides decision support only. No autonomous spacecraft commands are issued.</p>
        </div>
      )}
    </section>
  );
}