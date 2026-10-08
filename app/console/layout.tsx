import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/shell";
import { ConsoleProvider } from "@/lib/console/store";
import { csSans, csSerif } from "@/lib/console/fonts";

export const metadata: Metadata = { title: "Scouthru OS" };

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSerif.variable} ${csSans.variable} cs`}>
      <ConsoleProvider>
        <ConsoleShell>{children}</ConsoleShell>
      </ConsoleProvider>
    </div>
  );
}
