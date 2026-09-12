export default function DashboardLoading() {
  return (
    <main className="container main" id="main-content">
      <div className="status-panel">
        <span className="spinner" aria-hidden="true" />
        <div>
          <h1>Loading workspace</h1>
          <p>Validating your session and permissions.</p>
        </div>
      </div>
    </main>
  );
}
