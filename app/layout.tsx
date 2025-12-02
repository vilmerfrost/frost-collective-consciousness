import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frost Collective Consciousness",
  description: "Multi-agent consensus system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

