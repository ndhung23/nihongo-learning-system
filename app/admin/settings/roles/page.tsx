import { requireAdminPage } from "@/lib/admin/page-auth";
import { RolesClient } from "./RolesClient";
export default async function RolesPage() { const session = await requireAdminPage("admin:role:read"); return <RolesClient canCreate={session.permissions.includes("admin:role:create")} canDelete={session.permissions.includes("admin:role:delete")} canUpdate={session.permissions.includes("admin:role:update")} />; }
