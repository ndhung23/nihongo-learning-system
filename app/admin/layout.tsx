import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Admin pages depend on live MongoDB data and must never run during Vercel's build.
  await connection();

  try {
    await requirePermission("admin:stats:read");
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/flashcards");
  }

  return <AdminShell>{children}</AdminShell>;
}
