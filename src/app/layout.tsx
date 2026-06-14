import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TuesdayOps",
  description: "Post-launch monitoring, QA, and proof reports for AI agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full bg-white lg:bg-zinc-100`}
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
