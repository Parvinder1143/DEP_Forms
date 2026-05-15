import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Institute Forms — IIT Ropar",
  description: "Digitalized institute forms for IIT Ropar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-screen bg-white text-slate-900">
        <div className="app-canvas">
          <div className="app-aurora app-aurora-a" aria-hidden="true" />
          <div className="app-aurora app-aurora-b" aria-hidden="true" />
          <div className="app-aurora app-aurora-c" aria-hidden="true" />
          <div className="app-grid" aria-hidden="true" />

          <div className="app-content pt-20">
            <TopNav />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
