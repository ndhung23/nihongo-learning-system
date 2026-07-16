import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(225,29,72,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.4),transparent)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[288px_1fr]">
        <Sidebar />
        <section className="min-w-0">
          <Topbar />
          {children}
        </section>
      </div>
    </main>
  );
}
