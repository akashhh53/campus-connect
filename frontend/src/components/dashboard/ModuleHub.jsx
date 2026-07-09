import { Link } from "react-router";
import { FiArrowDown, FiArrowRight, FiCheckCircle } from "react-icons/fi";

const ModuleHub = ({
  eyebrow,
  title,
  description,
  metrics = [],
  highlights = [],
  actions = [],
}) => {
  const quickActionsId = "dashboard-quick-actions";

  return (
    <main className="cc-page">
      <section className="cc-hero">
        <div>
          {eyebrow && <div className="cc-eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          <p>{description}</p>
          {actions.length > 0 && (
            <div className="cc-hero-actions">
              <a className="cc-hero-scroll" href={`#${quickActionsId}`}>
                <FiArrowDown />
                Jump to quick actions
              </a>
            </div>
          )}
        </div>

        <aside className="cc-hero-panel">
          {highlights.slice(0, 3).map((item) => (
            <div className="cc-pill" key={item}>
              <FiCheckCircle />
              <span>{item}</span>
            </div>
          ))}
        </aside>
      </section>

      {metrics.length > 0 && (
        <section className="cc-stat-grid" aria-label={`${title} stats`}>
          {metrics.map((metric) => (
            <div className="cc-stat-card" key={metric.label}>
              <span className="cc-stat-value">{metric.value}</span>
              <span className="cc-stat-label">{metric.label}</span>
            </div>
          ))}
        </section>
      )}

      {actions.length > 0 && (
        <section
          aria-labelledby={`${quickActionsId}-title`}
          className="cc-actions-section"
          id={quickActionsId}
        >
          <div className="cc-section-heading">
            <span className="cc-section-kicker">Available shortcuts</span>
            <h2 className="cc-section-title" id={`${quickActionsId}-title`}>
              Quick Actions
            </h2>
            <p>
              Scroll here whenever you want a fast entry point into the campus
              tools you use most.
            </p>
          </div>

          <div className="cc-actions-grid">
            {actions.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  <span className="cc-action-top">
                    <span className="cc-action-icon">{Icon && <Icon />}</span>
                    {action.meta && (
                      <span className="cc-action-meta">{action.meta}</span>
                    )}
                  </span>
                  <span className="cc-action-copy">
                    <p className="cc-action-title">{action.label}</p>
                    <p className="cc-action-desc">{action.description}</p>
                  </span>
                  <span className="cc-action-footer">
                    <span>{action.to ? "Open workspace" : "Preview"}</span>
                    {action.to && (
                      <span className="cc-action-arrow">
                        <FiArrowRight />
                      </span>
                    )}
                  </span>
                </>
              );

              if (action.to) {
                return (
                  <Link className="cc-action-tile" key={action.label} to={action.to}>
                    {content}
                  </Link>
                );
              }

              return (
                <div className="cc-action-tile" key={action.label}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default ModuleHub;
