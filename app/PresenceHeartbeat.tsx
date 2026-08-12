"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PresenceHeartbeat() {
  const pathname = usePathname();
  useEffect(() => {
    let stopped = false;
    const ping = () => {
      if (stopped || document.visibilityState === "hidden") return;
      void fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: window.location.pathname + window.location.search }), keepalive: true }).catch(() => undefined);
    };
    ping();
    const interval = window.setInterval(ping, 30_000);
    window.addEventListener("focus", ping);
    document.addEventListener("visibilitychange", ping);
    return () => { stopped = true; window.clearInterval(interval); window.removeEventListener("focus", ping); document.removeEventListener("visibilitychange", ping); };
  }, [pathname]);
  return null;
}
