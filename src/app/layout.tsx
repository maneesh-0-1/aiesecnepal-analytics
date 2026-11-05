import type { Metadata } from "next";
import "./globals.css";
import { MobileLayout } from "@/components/MobileLayout";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "AIESEC in Nepal | National Analytics Cockpit",
  description: "Real-time Operational & Local Committee Analytics for AIESEC in Nepal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Raleway:wght@300;400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
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
