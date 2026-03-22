import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperCanvas — No-Code Algo Trading Platform",
  description:
    "Build, backtest, and deploy algorithmic trading strategies with a visual node-based editor. No coding required.",
  keywords: [
    "algorithmic trading",
    "no-code",
    "backtesting",
    "trading strategy",
    "quantitative finance",
    "node editor",
  ],
  openGraph: {
    title: "SuperCanvas — No-Code Algo Trading Platform",
    description:
      "Build, backtest, and deploy algorithmic trading strategies visually.",
    siteName: "SuperCanvas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#5c7cfa",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
