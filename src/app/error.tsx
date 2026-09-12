"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container main" id="main-content">
      <div className="status-panel" role="alert">
        <div>
          <h1>We could not load this page</h1>
          <p>
            Your work is not lost. Try again, or return later if the problem
            continues.
          </p>
          <button className="button" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
