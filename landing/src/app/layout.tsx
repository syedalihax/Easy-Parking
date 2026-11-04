import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://easyparking.example.com"),
  title: "easyParking | Simple Parking Management Software",
  description:
    "easyParking helps parking owners and managers organize members, vehicles, subscriptions, dues, payments, and daily parking records in one clear workspace.",
  keywords: [
    "parking management",
    "parking software",
    "easyParking",
    "parking billing",
    "parking records",
    "parking dues",
  ],
  openGraph: {
    title: "easyParking | Simple Parking Management Software",
    description:
      "Organize member records, vehicle details, monthly subscriptions, day-to-day parking, and payment history in one workspace.",
    url: "https://easyparking.example.com",
    siteName: "easyParking",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "easyParking | Simple Parking Management Software",
    description:
      "Organize member records, vehicle details, monthly subscriptions, day-to-day parking, and payment history in one workspace.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
