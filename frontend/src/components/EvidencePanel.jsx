export default function EvidencePanel({
    incident,
    investigation,
    evidence,
    verification,
    tamperVerification,
    verifying,
    onVerify,
    onTamperTest
}) {
    if (!investigation) {
        return (
            <section className="evidence-panel idle">
                <h2>Evidence Chain</h2>

                <p className="muted">
                    Complete the AI investigation first.
                </p>
            </section>
        );
    }

    if (!evidence) {
        return (
            <section className="evidence-panel idle">
                <h2>Evidence Chain</h2>

                <p className="muted">
                    Evidence Package will be generated
                    after the human operator records
                    a decision.
                </p>

                <div className="evidence-field">
                    <span className="field-label">
                        Incident
                    </span>

                    <p className="field-value mono">
                        {incident?.id ??
                            incident?.incident_id ??
                            "—"}
                    </p>
                </div>
            </section>
        );
    }

    const packageData =
        evidence.package || {};

    return (
        <section className="evidence-panel">

            <div className="section-header">
                <h2>
                    Evidence Chain
                </h2>

                <span className="priority-badge">
                    SHA-256
                </span>
            </div>

            <div className="evidence-grid">

                <div className="evidence-field">
                    <span className="field-label">
                        Evidence ID
                    </span>

                    <p className="field-value mono">
                        {evidence.evidence_id}
                    </p>
                </div>

                <div className="evidence-field">
                    <span className="field-label">
                        Incident ID
                    </span>

                    <p className="field-value mono">
                        {evidence.incident_id}
                    </p>
                </div>

                <div className="evidence-field full-width">
                    <span className="field-label">
                        SHA-256 fingerprint
                    </span>

                    <p
                        className="field-value mono"
                        style={{
                            wordBreak: "break-all"
                        }}
                    >
                        {evidence.sha256}
                    </p>
                </div>

                <div className="evidence-field">
                    <span className="field-label">
                        Diagnosis
                    </span>

                    <p className="field-value">
                        {packageData.diagnosis ||
                            "—"}
                    </p>
                </div>

                <div className="evidence-field">
                    <span className="field-label">
                        Confidence
                    </span>

                    <p className="field-value">
                        {typeof packageData.confidence ===
                        "number"
                            ? `${(
                                packageData.confidence *
                                100
                            ).toFixed(1)}%`
                            : "—"}
                    </p>
                </div>

                <div className="evidence-field">
                    <span className="field-label">
                        Operator Decision
                    </span>

                    <p className="field-value">
                        {packageData
                            .operator_decision
                            ?.decision ||
                            "—"}
                    </p>
                </div>

                <div className="evidence-field">
                    <span className="field-label">
                        Package Status
                    </span>

                    <p
                        className={`field-value ${
                            verification?.valid
                                ? "yes"
                                : ""
                        }`}
                    >
                        {verification?.status ||
                            "NOT VERIFIED"}
                    </p>
                </div>

            </div>

            <div className="evidence-actions">

                <button
                    type="button"
                    disabled={verifying}
                    onClick={onVerify}
                >
                    {verifying
                        ? "VERIFYING..."
                        : "VERIFY EVIDENCE"}
                </button>

                <button
                    type="button"
                    disabled={verifying}
                    onClick={onTamperTest}
                >
                    {verifying
                        ? "TESTING..."
                        : "RUN TAMPER TEST"}
                </button>

            </div>

            {verification && (
                <div className="evidence-verification">

                    <h3>
                        Original Package
                    </h3>

                    <p>
                        Status:
                        <strong>
                            {" "}
                            {verification.status}
                        </strong>
                    </p>

                    <p className="mono">
                        Computed:
                        {" "}
                        {verification.computed_sha256}
                    </p>

                    <p className="mono">
                        Expected:
                        {" "}
                        {verification.expected_sha256}
                    </p>

                </div>
            )}

            {tamperVerification && (
                <div className="evidence-verification">

                    <h3>
                        Tamper Test
                    </h3>

                    <p>
                        Status:
                        <strong>
                            {" "}
                            {
                                tamperVerification.status
                            }
                        </strong>
                    </p>

                    <p className="mono">
                        Computed:
                        {" "}
                        {
                            tamperVerification
                                .computed_sha256
                        }
                    </p>

                    <p className="mono">
                        Expected:
                        {" "}
                        {
                            tamperVerification
                                .expected_sha256
                        }
                    </p>

                </div>
            )}

            <details className="evidence-json">
                <summary>
                    View canonical evidence package
                </summary>

                <pre>
                    {JSON.stringify(
                        packageData,
                        null,
                        2
                    )}
                </pre>
            </details>

        </section>
    );
}