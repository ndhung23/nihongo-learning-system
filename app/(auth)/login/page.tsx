import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const requestedReturnTo = params.returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/flashcards";
  return (
    <AuthCard title="Đăng nhập" subtitle="Đăng nhập để học, tạo flashcard và truy cập trang admin nếu có quyền.">
      <LoginForm oauthError={params.error} returnTo={returnTo} />
    </AuthCard>
  );
}
