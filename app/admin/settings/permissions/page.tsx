import { requireAdminPage } from "@/lib/admin/page-auth";
import { PermissionMatrixClient } from "./PermissionMatrixClient";
export default async function PermissionsPage() { const session = await requireAdminPage("admin:permission:read"); return <PermissionMatrixClient canUpdate={session.permissions.includes("admin:permission:update")} />; }
