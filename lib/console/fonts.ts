import { Instrument_Sans } from "next/font/google";

/**
 * Console type: Instrument Sans for headings and text, the same face as scouthru.com.
 * Shared by /console and the marketplace pages.
 */
// Variable, with the width axis: the dense dashboards (.cs-dense) set it a touch narrower so
// labels laid out for a tighter face still fit; the marketplace keeps the website's full width.
export const csSans = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--font-cs-sans", display: "swap" });
