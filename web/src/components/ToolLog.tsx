import type { PlanStep } from '../App';

interface ToolLogProps {
  plan: PlanStep[];
}

export function ToolLog({ plan }: ToolLogProps) {
  return (
    <section className="panel tool-log">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Plan</p>
          <h2>Tool routing</h2>
        </div>
        <button className="ghost">Logs</button>
      </header>
      <div className="tool-log__list">
        {plan.length === 0 ? (
          <p className="muted">No plan yet. Send a message to see routing and model choices.</p>
        ) : (
          plan.map((step, idx) => (
            <article key={idx} className="log-entry">
              <p className="log-entry__title">{step.step}</p>
              <p className="log-entry__meta">
                {step.model && <span>Model: {step.model}</span>}
                {step.provider && <span>Provider: {step.provider}</span>}
              </p>
              {step.reason && <p className="muted">{step.reason}</p>}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
