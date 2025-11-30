import type { Metadata } from "next";
import { Almendra } from "next/font/google";
import "./globals.css";

const almendra = Almendra({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-almendra",
});

export const metadata: Metadata = {
  title: "Alt Auth",
  description: "Universal authentication service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${almendra.className} antialiased`}>{children}</body>
    </html>
  );
}
