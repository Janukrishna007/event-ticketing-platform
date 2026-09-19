import type { Metadata } from "next";
import { WebMcpTools } from "@/components/webmcp-tools";
import "./globals.css";

export const metadata: Metadata = {
  title: "events by µlearn",
  description: "Discover, register for, and manage µlearn events in one place.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-scroll-behavior="smooth">
      <body className="antialiased"><WebMcpTools />{children}</body>
    </html>
  );
}
