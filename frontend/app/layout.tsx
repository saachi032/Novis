import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Novis",
  description:
    "Automated on-chain USDC yield on Base. Allocates across Aave v3 and Compound v3 with gas-aware rebalancing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${workSans.variable} min-h-screen bg-brand-bg font-body antialiased text-brand-black`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
