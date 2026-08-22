export default function InvestigationPanel({ investigation, loading, error }) {
  if (loading) {
    return (
      <section className="investigation-panel loading">
        <h2>AI Investigation</h2>
        <div className="loading-steps">
          <p className="loading-step">Analyzing incident telemetry…</p>
          <p className="loading-step">Reconstructing evidence…</p>
          <p className="loading-step">Generating investigation…</p>
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="investigation-panel error">
        <h2>AI Investigation</h2>
        <div className="error-box"><strong>Investigation failed</strong><p>{error}</p></div>
      </section>
    );
  }
  if (!investigation) {
    return (
      <section className="investigation-panel idle">
        <h2>AI Investigation</h2>
        <p className="muted">Press <strong>INVESTIGATE</strong> to run the AI-assisted analysis.</p>
      </section>
    );
  }
  const confidencePct = Math.round((investigation.confidence || 0) * 100);
  const isMock = investigation._isMock === true;
  return (
    <section className="investigation-panel">
      <div className="section-header">
        <h2>AI Investigation</h2>
        {isMock && <span className="mock-badge" title="Backend not available – preview data">Preview data</span>}
      </div>
      <div className="investigation-grid">
        <div className="investigation-field diagnosis">
          <span className="field-label">Likely Cause</span>
          <p className="field-value large">{investigation.diagnosis}</p>
        </div>
        <div className="investigation-field confidence">
          <span className="field-label">Confidence</span>
          <p className="field-value large">{confidencePct}%</p>
          <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${confidencePct}%` }} /></div>
        </div>
        <div className="investigation-field evidence-list">
          <span className="field-label">Evidence</span>
          <ul>{(investigation.evidence || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
        <div className="investigation-field actions">
          <span className="field-label">Recommended Review</span>
          <ol>{(investigation.recommended_actions || []).map((item, i) => <li key={i}>{item}</li>)}</ol>
        </div>
        <div className="investigation-field risk">
          <span className="field-label">Risk</span>
          <p className="field-value">{investigation.risk || "—"}</p>
        </div>
        <div className="investigation-field human-review">
          <span className="field-label">Human Review Required</span>
          <p className={`field-value ${investigation.human_review_required ? "yes" : "no"}`}>
            {investigation.human_review_required ? "YES" : "NO"}
          </p>
        </div>
      </div>
    </section>
  );
}
