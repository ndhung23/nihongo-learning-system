import { AuthCard } from "../AuthCard";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthCard title="Tạo tài khoản" subtitle="Chỉ cần username, email và mật khẩu để bắt đầu học.">
      <RegisterForm />
    </AuthCard>
  );
}
