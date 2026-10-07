import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gametogenesis Challenge",
  description:
    "Kahoot-style quiz about human gametogenesis for the whole classroom. Answer fast, earn points, climb the leaderboard!",
};

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-var",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-body-var",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full">
      <body className={`${baloo.variable} ${nunito.variable} min-h-full`}>{children}</body>
    </html>
  );
}