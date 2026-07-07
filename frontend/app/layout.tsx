import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Backdrop } from "@/components/Backdrop";
import { NetworkBanner } from "@/components/NetworkBanner";
import { CONTRACT_ADDRESS, explorerAddressUrl } from "@/lib/config";

const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Curia — the GenLayer allocation court",
  description:
    "Grant rounds, bounty pools, hackathon prizes, and contributor rewards as payable allocation courts. Sponsors deposit GEN, applicants file evidence, GenLayer validators rule, winners claim.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Backdrop />
          <NetworkBanner />
          <Nav />
          <main className="flex-1">{children}</main>
          <footer style={{ borderTop: "1px solid var(--hairline)" }}>
            <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
              <span>
                Curia — every ruling is a public, verifiable GenLayer transaction.
              </span>
              <span className="flex items-center gap-4">
                <Link
                  href={explorerAddressUrl(CONTRACT_ADDRESS)}
                  target="_blank"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Contract on explorer ↗
                </Link>
                <span className="mono">Studionet</span>
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
