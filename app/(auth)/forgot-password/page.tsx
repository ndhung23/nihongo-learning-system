import { AuthCard } from "../AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Quên mật khẩu" subtitle="Nhập email để tạo link đặt lại mật khẩu. Dev mode sẽ hiện link ngay trên màn hình.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
