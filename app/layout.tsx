import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Scouthru · India's FMCG makers, matched by capability", template: "%s · Scouthru" },
  description: "The B2B platform for FMCG brand owners, manufacturers, suppliers and distributors. Find Indian makers by what they can make and the capacity they have free, then run every order from idea to delivery in one place.",
};

export const viewport: Viewport = { themeColor: "#10201b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
