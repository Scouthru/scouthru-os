import { ConsoleProvider } from "@/lib/console/store";
import { csSans } from "@/lib/console/fonts";

// Rendered per request: the demo data is dated relative to "now", so a page built at
// deploy time would disagree with the browser's copy days later.
export const dynamic = "force-dynamic";

/** Website pages (home, /os, /demo) in the Scouthru OS look, reading the same demo data. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSans.variable} cs min-h-dvh`}>
      <ConsoleProvider>{children}</ConsoleProvider>
    </div>
  );
}
