import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "./PwaRegistration";

export const metadata: Metadata = {
  title: "Nihongo Learning System",
  description: "Nền tảng học tiếng Nhật cho người Việt.",
  applicationName: "Nihongo Learning System",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nihongo",
  },
  icons: {
    icon: [
      { url: "/icons/nihongo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/nihongo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/nihongo-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
