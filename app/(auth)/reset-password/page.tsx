import { Suspense } from "react";
import { AuthCard } from "../AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản của bạn.">
      <Suspense fallback={<p className="mt-6 text-sm font-bold text-slate-500">Đang tải token...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
