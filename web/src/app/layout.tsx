import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Gratitude Journal",
  description: "A private photo-first gratitude journal for daily memories.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Journal",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#c7455c",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
