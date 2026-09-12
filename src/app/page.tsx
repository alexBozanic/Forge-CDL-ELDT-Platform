export default function HomePage() {
  return (
    <main className="container main" id="main-content">
      <section className="hero" aria-labelledby="page-title">
        <p className="kicker">Foundation build</p>
        <h1 id="page-title">A clear path through CDL theory learning.</h1>
        <p className="lede">
          Forge is being built for schools to assign training, support students,
          preserve learning records, and manage a manual reporting workflow.
        </p>
        <div className="notice" role="note" aria-label="Demonstration status">
          <strong>Demonstration environment</strong>
          <span>
            No curriculum or training record shown here is approved for
            real-world delivery.
          </span>
        </div>
      </section>
      <section aria-labelledby="readiness-title">
        <h2 id="readiness-title">Readiness is tracked honestly</h2>
        <div className="gate-grid">
          {[
            ["Software", "Foundation in progress"],
            ["Curriculum", "Independent review required"],
            ["Provider", "School eligibility required"],
            ["Jurisdiction", "Requirements must be verified"],
          ].map(([name, status]) => (
            <article className="gate" key={name}>
              <h3>{name}</h3>
              <p>{status}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
