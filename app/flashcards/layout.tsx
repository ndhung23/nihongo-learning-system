import { AppShell } from "./components/AppShell";

export default function FlashcardsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
