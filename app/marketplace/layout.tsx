import { ConsoleProvider } from "@/lib/console/store";
import { csSans, csSerif } from "@/lib/console/fonts";

// Rendered per request: the demo data is dated relative to "now", so a page built at
// deploy time would disagree with the browser's copy days later.
export const dynamic = "force-dynamic";

/** Marketplace pages share the console's data (enquiries, samples, orders) and its type. */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSerif.variable} ${csSans.variable} cs min-h-dvh`}>
      <ConsoleProvider>{children}</ConsoleProvider>
    </div>
  );
}
