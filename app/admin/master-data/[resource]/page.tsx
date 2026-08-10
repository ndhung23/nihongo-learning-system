import { requireAdminPage } from "@/lib/admin/page-auth";
import { getMasterDataResource } from "@/lib/admin/master-data";
import { notFound } from "next/navigation";
import { MasterDataResourceClient } from "./MasterDataResourceClient";
export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) { const session = await requireAdminPage("admin:master-data:read"); const { resource } = await params; if (!getMasterDataResource(resource)) notFound(); return <MasterDataResourceClient resource={resource} canUpdate={session.permissions.includes("admin:master-data:update")} canDelete={session.permissions.includes("admin:master-data:delete")} />; }
