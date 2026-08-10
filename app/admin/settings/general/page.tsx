import { requireAdminPage } from "@/lib/admin/page-auth";
import { GeneralSettingsClient } from "./GeneralSettingsClient";
export default async function GeneralSettingsPage() { const session = await requireAdminPage("admin:settings:read"); return <GeneralSettingsClient canUpdate={session.permissions.includes("admin:settings:update")} />; }
