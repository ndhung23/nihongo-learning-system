import { PaymentReviewClient } from "./PaymentReviewClient";
import { requireAdminPage } from "@/lib/admin/page-auth";

export default async function AdminPaymentsPage() {
  await requireAdminPage("admin:payment:read");
  return <PaymentReviewClient />;
}
