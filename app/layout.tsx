import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import Navbar from "@/app/components/Navbar";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IIT Ropar Forms | Official Portal",
  description: "Institutional forms management system - Email, Vehicle, Hostel, Guest House",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <AuthProvider>
          <Navbar />
          <div className="app-canvas">
            <div className="app-aurora app-aurora-a" aria-hidden="true" />
            <div className="app-aurora app-aurora-b" aria-hidden="true" />
            <div className="app-aurora app-aurora-c" aria-hidden="true" />
            <div className="app-grid" aria-hidden="true" />
            <div className="app-content">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
