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
  metadataBase: new URL("https://easyparking.example.com"),
  title: "EasyParking | Smarter Parking Operations",
  description:
    "EasyParking helps parking operators manage members, occupancy, billing, and daily operations from one clear dashboard.",
  keywords: [
    "parking management",
    "parking software",
    "easyparking",
    "parking billing",
    "parking ops",
  ],
  openGraph: {
    title: "EasyParking | Smarter Parking Operations",
    description:
      "Manage member access, billing, and daily parking workflows from one modern platform.",
    url: "https://easyparking.example.com",
    siteName: "EasyParking",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyParking | Smarter Parking Operations",
    description:
      "Manage member access, billing, and daily parking workflows from one modern platform.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
