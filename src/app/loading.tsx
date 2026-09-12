export default function Loading() {
  return (
    <main
      className="container main"
      id="main-content"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="status-panel">
        <span className="spinner" aria-hidden="true" />
        <div>
          <h1>Loading your workspace</h1>
          <p>Please wait while Forge prepares this page.</p>
        </div>
      </div>
    </main>
  );
}
