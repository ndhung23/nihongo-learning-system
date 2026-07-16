import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthCard title="Đăng nhập" subtitle="Đăng nhập để học, tạo flashcard và truy cập trang admin nếu có quyền.">
      <LoginForm />
    </AuthCard>
  );
}
