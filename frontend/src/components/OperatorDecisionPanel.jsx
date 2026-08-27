import { useState } from "react";

<<<<<<< HEAD
export default function OperatorDecisionPanel({ investigation, onDecision }) {
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
=======
export default function OperatorDecisionPanel({
    investigation,
    onDecision
}) {
    const [note, setNote] =
        useState("");
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166

    const [decision, setDecision] =
        useState(null);

<<<<<<< HEAD
  async function handleDecision(type) {
    setSubmitting(true);
    setError(null);
    try {
      if (typeof onDecision === "function") {
        await onDecision({ type, note });
      }
      setDecision(type);
    } catch (err) {
      setError(err.message || "Failed to save the decision. Please try again.");
    } finally {
      setSubmitting(false);
=======
    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState(null);

    if (!investigation) {
        return (
            <section className="decision-panel idle">
                <h2>Operator Decision</h2>

                <p className="muted">
                    Complete the investigation
                    before recording a decision.
                </p>
            </section>
        );
    }

    async function handleDecision(type) {
        setSubmitting(true);
        setError(null);

        try {
            await onDecision({
                type,
                note
            });

            setDecision(type);
        } catch (err) {
            setDecision(null);

            setError(
                err.message ||
                "Failed to record operator decision."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (decision) {
        return (
            <section className="decision-panel decided">

                <h2>
                    Operator Decision
                </h2>

                <div className="decision-recorded">

                    <p>
                        Decision recorded:
                        {" "}
                        <strong>
                            {decision
                                .replace(
                                    "_",
                                    " "
                                )
                                .toUpperCase()}
                        </strong>
                    </p>

                    {note && (
                        <p className="decision-note-display">
                            Note: {note}
                        </p>
                    )}

                    <p className="hint">
                        Persisted in MissionVault
                        Sentinel and included in
                        the Evidence Package.
                    </p>

                </div>

            </section>
        );
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166
    }

    return (
<<<<<<< HEAD
      <section className="decision-panel decided">
        <h2>Operator Decision</h2>
        <div className="decision-recorded">
          <p>
            Decision recorded: <strong>{decision.replace("_", " ").toUpperCase()}</strong>
          </p>
          {note && <p className="decision-note-display">Note: {note}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="decision-panel">
      <div className="section-header">
        <h2>Operator Decision</h2>
        <span className="priority-badge">P1</span>
      </div>

      <div className="decision-note-field">
        <label htmlFor="decision-note">Decision note</label>
        <textarea
          id="decision-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any operational context or rationale..."
        />
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="decision-actions">
        <button
          type="button"
          className="btn-accept"
          disabled={submitting}
          onClick={() => handleDecision("accept")}
        >
          ACCEPT RECOMMENDATION
        </button>
        <button
          type="button"
          className="btn-reject"
          disabled={submitting}
          onClick={() => handleDecision("reject")}
        >
          REJECT
        </button>
        <button
          type="button"
          className="btn-reviewed"
          disabled={submitting}
          onClick={() => handleDecision("mark_reviewed")}
        >
          MARK AS REVIEWED
        </button>
      </div>
    </section>
  );
=======
        <section className="decision-panel">

            <div className="section-header">
                <h2>
                    Operator Decision
                </h2>

                <span className="priority-badge">
                    HUMAN
                </span>
            </div>

            <div className="decision-note-field">

                <label htmlFor="decision-note">
                    Decision note
                </label>

                <textarea
                    id="decision-note"
                    rows={3}
                    value={note}
                    onChange={(event) =>
                        setNote(event.target.value)
                    }
                    placeholder={
                        "Add operational context or rationale..."
                    }
                />

            </div>

            {error && (
                <p className="auth-error">
                    {error}
                </p>
            )}

            <div className="decision-actions">

                <button
                    type="button"
                    className="btn-accept"
                    disabled={submitting}
                    onClick={() =>
                        handleDecision(
                            "accept"
                        )
                    }
                >
                    ACCEPT RECOMMENDATION
                </button>

                <button
                    type="button"
                    className="btn-reject"
                    disabled={submitting}
                    onClick={() =>
                        handleDecision(
                            "reject"
                        )
                    }
                >
                    REJECT
                </button>

                <button
                    type="button"
                    className="btn-reviewed"
                    disabled={submitting}
                    onClick={() =>
                        handleDecision(
                            "mark_reviewed"
                        )
                    }
                >
                    MARK AS REVIEWED
                </button>

            </div>

        </section>
    );
>>>>>>> 12ac0cbcc872779fddac10942b4b795c6c772166
}