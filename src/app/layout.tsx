import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bucureștiul posibil",
  description: "Vrem un oraș care respiră. Un București în care spațiul public aparține și este accesibil oamenilor în loc să fie sufocat de betoane și mașini. " +
    "Un București care schimbă asfaltul încins în copaci umbroși, claxoanele în conversații și nervii din trafic în locuri care ne aduc împreună.",
  keywords: ["București", "oraș pentru oameni", "new urbanism", "VR", "360", "pietoni", "pietonală"],
  authors: [{ name: "Liviu Bǎrbulescu" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
