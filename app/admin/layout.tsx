import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthError, requireAnyPermission } from "@/lib/auth/session";
import { adminPermissions } from "@/lib/auth/permissions";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Admin pages depend on live MongoDB data and must never run during Vercel's build.
  await connection();

  let permissions: string[];
  try {
    const session = await requireAnyPermission(adminPermissions);
    permissions = session.permissions;
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/flashcards");
  }

  return <AdminShell permissions={permissions}>{children}</AdminShell>;
}
