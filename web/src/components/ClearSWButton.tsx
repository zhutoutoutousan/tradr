"use client";

import { useState } from "react";

export default function ClearSWButton() {
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");

  const clearServiceWorkers = async () => {
    if (!("serviceWorker" in navigator)) {
      setMessage("❌ Service Workers not supported");
      return;
    }

    setClearing(true);
    setMessage("🔄 Clearing...");

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        setMessage("✅ No Service Workers found");
        setClearing(false);
        return;
      }

      let count = 0;
      for (const registration of registrations) {
        await registration.unregister();
        count++;
      }

      setMessage(`✅ Cleared ${count} Service Worker(s)! Reload page now.`);
      
      // Auto-reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <button
        onClick={clearServiceWorkers}
        disabled={clearing}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {clearing ? "Clearing..." : "🔧 Clear SW"}
      </button>
      {message && (
        <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
          {message}
        </div>
      )}
    </div>
  );
}
