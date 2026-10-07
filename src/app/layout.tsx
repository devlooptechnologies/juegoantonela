import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gametogenesis Challenge",
  description:
    "Kahoot-style quiz about human gametogenesis for the whole classroom. Answer fast, earn points, climb the leaderboard!",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}