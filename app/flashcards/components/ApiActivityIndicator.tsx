"use client";

import { useEffect, useRef, useState } from "react";

export function ApiActivityIndicator() {
  const [visible, setVisible] = useState(false);
  const activeRequestsRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    function beginRequest() {
      activeRequestsRef.current += 1;
      if (activeRequestsRef.current === 1) {
        showTimerRef.current = window.setTimeout(() => setVisible(true), 180);
      }
    }

    function endRequest() {
      activeRequestsRef.current = Math.max(activeRequestsRef.current - 1, 0);
      if (activeRequestsRef.current === 0) {
        if (showTimerRef.current !== null) {
          window.clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        setVisible(false);
      }
    }

    const trackedFetch: typeof window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const shouldTrack =
        url.startsWith("/api/") ||
        url.startsWith(`${window.location.origin}/api/`);

      if (!shouldTrack) return originalFetch(input, init);

      beginRequest();
      try {
        return await originalFetch(input, init);
      } finally {
        endRequest();
      }
    };

    window.fetch = trackedFetch;
    return () => {
      window.fetch = originalFetch;
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-teal-100">
        <div className="h-full w-1/3 animate-[api-loading_1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-rose-500 via-violet-500 to-teal-500" />
      </div>
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-black text-slate-700 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100">
        <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-teal-500" />
        Đang tải dữ liệu...
      </div>
      <style>{`
        @keyframes api-loading {
          0% { transform: translateX(-110%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(310%); }
        }
      `}</style>
    </>
  );
}
