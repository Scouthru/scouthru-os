import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";
import "./globals.css";

// One face everywhere, as on scouthru.com: Instrument Sans for text and headings.
const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Scouthru · India's FMCG makers, matched by capability", template: "%s · Scouthru" },
  description: "The B2B platform for FMCG brand owners, manufacturers, suppliers and distributors. Find Indian makers by what they can make and the capacity they have free, then run every order from idea to delivery in one place.",
};

export const viewport: Viewport = { themeColor: "#221e1b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
