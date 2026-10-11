import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Auto-Scheduler",
  description:
    "Dump in your classes, shifts, and deadlines. Get an organised calendar back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
