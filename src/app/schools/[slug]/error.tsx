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
            Your data was not changed. Try again or return to the dashboard.
          </p>
          <button className="button" onClick={reset}>
            Try again
          </button>
          <Link className="button secondary" href="/dashboard">
            Return to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
