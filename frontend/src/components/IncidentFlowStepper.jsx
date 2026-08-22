const STEPS = [
  { id: "summary", label: "Incident" },
  { id: "timeline", label: "Timeline" },
  { id: "investigate", label: "Investigate" },
  { id: "investigation", label: "AI Investigation" },
  { id: "evidence", label: "Evidence" },
  { id: "recommendation", label: "Recommendation" },
  { id: "decision", label: "Decision" }
];

export default function IncidentFlowStepper({ currentStep = "summary" }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  return (
    <nav className="incident-stepper" aria-label="Incident investigation steps">
      <ol className="incident-stepper-list">
        {STEPS.map((step, index) => {
          let state = "upcoming";
          if (index < currentIndex) state = "done";
          if (index === currentIndex) state = "current";
          return (
            <li key={step.id} className={`incident-step incident-step-${state}`}>
              <span className="incident-step-number">{index + 1}</span>
              <span className="incident-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
