import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/shell";
import { ConsoleProvider } from "@/lib/console/store";
import { csSans } from "@/lib/console/fonts";

// Rendered per request: the demo data is dated relative to "now", so a page built at
// deploy time would disagree with the browser's copy days later.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Scouthru OS" };

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSans.variable} cs cs-dense`}>
      <ConsoleProvider>
        <ConsoleShell>{children}</ConsoleShell>
      </ConsoleProvider>
    </div>
  );
}
