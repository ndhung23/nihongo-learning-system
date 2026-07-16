import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nihongo Learning System",
  description: "Nền tảng học tiếng Nhật cho người Việt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
