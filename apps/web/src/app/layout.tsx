// ─────────────────────────────────────────────
// SuperCanvas — Root Layout
// Wires: ClerkProvider + ConvexProvider + tRPC
// ─────────────────────────────────────────────

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexClientProvider } from "../components/providers/ConvexClientProvider";
import { TRPCProvider } from "../components/providers/TRPCProvider";
import { Toaster } from "sonner";
import "sonner/dist/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SuperCanvas — No-Code Algo Trading",
  description:
    "Build, backtest, and deploy algorithmic trading strategies. No code required.",
  keywords: ["algorithmic trading", "backtest", "no-code", "quant", "strategy"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-surface-dark-0 text-white antialiased">
        <ClerkProvider
          appearance={{ baseTheme: dark }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          <ConvexClientProvider>
            <TRPCProvider>
              {children}
              <Toaster
                theme="dark"
                position="top-right"
                richColors
                closeButton
              />
            </TRPCProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
