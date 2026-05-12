import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistDisplay = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-display",
  display: "swap",
});

const geistBody = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Novis",
  description:
    "Automated on-chain stablecoin yield on Base Sepolia with USDC deposits, strategy routing, and gas-aware rebalancing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('novis-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistDisplay.variable} ${geistBody.variable} min-h-screen bg-brand-bg font-body antialiased text-brand-black transition-colors duration-200 dark:bg-[#1a1f1e] dark:text-neutral-100`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
