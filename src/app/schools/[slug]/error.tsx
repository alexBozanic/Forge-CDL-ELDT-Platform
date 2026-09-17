"use client";

import Link from "next/link";

export default function SchoolError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="container main" id="main-content">
      <div className="status-panel">
        <div>
          <h1>School workspace unavailable</h1>
          <p>
            We could not load this page. Reload it or return to the dashboard.
            If you just saved or submitted something, check its current status
            before repeating the action.
          </p>
          <button className="button" onClick={reset}>
            Reload page
          </button>
          <Link className="button secondary" href="/dashboard">
            Return to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
