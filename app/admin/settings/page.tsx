import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/page-auth";
export default async function SettingsPage() { await requireAdminPage("admin:settings:read"); redirect("/admin/settings/general"); }
