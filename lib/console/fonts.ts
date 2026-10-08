import { Inter_Tight, Newsreader } from "next/font/google";

/**
 * Console type: Newsreader for headings, Inter Tight for text. The mockups' text
 * sets about 8% narrower than regular Inter; Inter Tight matches their line breaks.
 * Shared by /console and the marketplace pages.
 */
export const csSerif = Newsreader({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cs-serif", display: "swap" });
export const csSans = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cs-sans", display: "swap" });
