import { ConsoleProvider } from "@/lib/console/store";
import { csSans } from "@/lib/console/fonts";

// Rendered per request: the demo data is dated relative to "now", so a page built at
// deploy time would disagree with the browser's copy days later.
export const dynamic = "force-dynamic";

/** Marketplace pages share the console's data (enquiries, samples, orders) and its type. */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSans.variable} cs mk min-h-dvh`}>
      <ConsoleProvider>{children}</ConsoleProvider>
    </div>
  );
}
