import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const heading = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-heading" });
const body = Lora({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Domainers Map",
  description: "Global discovery and intelligence for domain investors, brokers and the companies that buy names.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1b1917" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
