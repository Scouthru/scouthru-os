import { ConsoleProvider } from "@/lib/console/store";
import { csSans, csSerif } from "@/lib/console/fonts";

/** Website pages (home, /os, /demo) in the Scouthru OS look, reading the same demo data. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSerif.variable} ${csSans.variable} cs min-h-dvh`}>
      <ConsoleProvider>{children}</ConsoleProvider>
    </div>
  );
}
