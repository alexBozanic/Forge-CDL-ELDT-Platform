import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Forge CDL ELDT Platform",
  description:
    "Demonstration learning-platform software for independent CDL schools.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <div>
              <p className="eyebrow">Forge CDL ELDT Platform</p>
              <p className="brand-subtitle">Education software foundation</p>
            </div>
            <span className="demo-badge">Demonstration only</span>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            Schools remain the training providers of record. This software
            demonstration is not authorization to deliver regulated training.
          </div>
        </footer>
      </body>
    </html>
  );
}
