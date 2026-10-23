"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ background: "#020617", color: "white", fontFamily: "sans-serif", padding: 32, textAlign: "center" }}>
        <h1>Etwas ist schiefgelaufen</h1>
        <p style={{ color: "#94a3b8" }}>Der Fehler wurde gemeldet.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, background: "#059669", color: "white", border: 0 }}>
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
