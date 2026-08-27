export default function RecommendationPanel({ investigation }) {
  if (!investigation) {
    return (
      <section className="recommendation-panel idle">
        <h2>Operator Review</h2>
        <p className="muted">Recommendations will appear after the investigation.</p>
      </section>
    );
  }

  const actions = investigation.recommended_actions || [];

  return (
    <section className="recommendation-panel">
      <div className="section-header">
        <h2>Operator Recommendation</h2>
        <span className="human-review-badge">HUMAN REVIEW</span>
      </div>

      <div className="recommendation-content">
        <div className="recommendation-field">
          <span className="field-label">Recommended actions</span>
          {actions.length === 0 ? (
            <p className="muted">No specific actions returned.</p>
          ) : (
            <ol className="action-list">
              {actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="recommendation-field">
          <span className="field-label">Operational risk</span>
          <p className="field-value">{investigation.risk || "---"}</p>
        </div>

        <div className="recommendation-field autonomous">
          <span className="field-label">Spacecraft control</span>
          <p className="field-value autonomous-value">NONE</p>
          <p className="hint">
            MissionVault Sentinel provides decision support only. No autonomous
            spacecraft commands are issued. Final authority remains with the
            human operator.
          </p>
        </div>
      </div>

      <div className="operator-decision-banner">
        <strong>OPERATOR DECISION REQUIRED</strong>
      </div>
    </section>
  );
}