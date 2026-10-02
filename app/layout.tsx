import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeFlow · Discharge Coordination Prototype",
  description: "A fictional NHS-style discharge coordination and family communication prototype for an innovation pitch.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
