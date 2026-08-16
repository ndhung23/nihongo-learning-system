import { AppShell } from "./components/AppShell";
import { cookies } from "next/headers";

export default async function FlashcardsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("nihongo-language")?.value;
  const initialLocale = savedLocale === "en" ? "en" : "vi";
  return <AppShell initialLocale={initialLocale}>{children}</AppShell>;
}
