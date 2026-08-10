import { requireAdminPage } from "@/lib/admin/page-auth";
import { MasterDataHomeClient } from "./MasterDataHomeClient";
export default async function MasterDataPage() { await requireAdminPage("admin:master-data:read"); return <MasterDataHomeClient />; }
