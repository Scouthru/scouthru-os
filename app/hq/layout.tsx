import type { Metadata } from "next";
import { HqShell } from "@/components/hq/shell";
import { HqProvider } from "@/lib/hq/store";
import { csSans, csSerif } from "@/lib/console/fonts";

// Team-only back office: kept out of search engines. Rendered per request like the console.
export const metadata: Metadata = { title: "Scouthru HQ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSerif.variable} ${csSans.variable} cs`}>
      <HqProvider>
        <HqShell>{children}</HqShell>
      </HqProvider>
    </div>
  );
}
