"use client";

import { useEffect, useState } from "react";

export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-3 top-3 z-[70] rounded-lg border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm"
    >
      You are offline. Changes may not save until the connection returns.
    </div>
  );
}
