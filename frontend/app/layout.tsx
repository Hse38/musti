import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ulaşım Destek Sistemi | TEKNOFEST",
  description: "TEKNOFEST katılımcı ulaşım ve fatura portalı",
  icons: {
    icon: "/analogo.png",
    apple: "/analogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
