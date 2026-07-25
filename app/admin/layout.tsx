import { redirect } from "next/navigation";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
