import { ConsoleProvider } from "@/lib/console/store";
import { csSans, csSerif } from "@/lib/console/fonts";

/** Marketplace pages share the console's data (enquiries, samples, orders) and its type. */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${csSerif.variable} ${csSans.variable} cs min-h-dvh`}>
      <ConsoleProvider>{children}</ConsoleProvider>
    </div>
  );
}
