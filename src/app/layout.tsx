import type { Metadata } from "next";
import "./globals.css";
import { MobileLayout } from "@/components/MobileLayout";
import { Lato, Raleway, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-lato",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-raleway",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIESEC | Global Operational Cockpit",
  description: "Advanced insight-driven dashboard for AIESEC global national operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${lato.variable} ${raleway.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>LOADING COCKPIT...</div>}>
          <MobileLayout>
            {children}
          </MobileLayout>
        </Suspense>
      </body>
    </html>
  );
}
