import { requireAdminPage } from "@/lib/admin/page-auth";
import { AffiliateProductsClient } from "./AffiliateProductsClient";

export default async function AffiliateProductsPage() {
  const session = await requireAdminPage("admin:affiliate-product:read");
  return <AffiliateProductsClient capabilities={{ create: session.permissions.includes("admin:affiliate-product:create"), update: session.permissions.includes("admin:affiliate-product:update"), delete: session.permissions.includes("admin:affiliate-product:delete") }} />;
}
