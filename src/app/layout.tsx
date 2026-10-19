import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Hanken_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-text",
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-condensed",
});

export const metadata: Metadata = {
  title: "Simulateur d'économies Club Santé Premium",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${hankenGrotesk.variable} ${barlowSemiCondensed.variable}`}
    >
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
