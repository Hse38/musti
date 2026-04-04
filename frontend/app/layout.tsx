import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEKNOFEST Bilet Kontrol",
  description: "Ulaşım faturası doğrulama ve raporlama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
