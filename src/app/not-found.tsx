import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container main" id="main-content">
      <div className="status-panel">
        <div>
          <h1>Page not found</h1>
          <p>
            The page may have moved or may not be available to your account.
          </p>
          <Link className="button" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
