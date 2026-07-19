import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TomoDagang",
  description: "Dashboard internal UMKM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
