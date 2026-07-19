import { AuthCard } from "../AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Quên mật khẩu" subtitle="Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
