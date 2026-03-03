import type { Metadata } from "next";

const siteName = "Crypto Market Intelligence Engine";
const tagline =
  "Real-time monitoring of crypto volatility and liquidity; detects anomalies via rolling z-scores, computes composite risk scores, and surfaces alerts with AI-generated summaries—all in one dashboard.";

export const metadata: Metadata = {
  title: siteName,
  description: tagline,
  openGraph: {
    title: siteName,
    description: tagline,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: tagline,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        {/* Global CSS built via Tailwind CLI to avoid webpack css-loader/sucrase parse error */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body className="min-h-screen bg-black text-zinc-100">{children}</body>
    </html>
  );
}
