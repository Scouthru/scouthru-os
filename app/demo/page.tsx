"use client";

import Link from "next/link";
import { Wordmark } from "@/components/market";
import { useStore } from "@/lib/store";

export default function Demo() {
  const { reset } = useStore();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1060px] items-center justify-between gap-3 px-5 py-3.5">
          <Link href="/"><Wordmark /></Link>
          <div className="flex gap-2">
            <Link href="/brand" className="rounded-lg border border-ink px-3.5 py-2 text-[14px] font-semibold">Brand view</Link>
            <Link href="/factory" className="rounded-lg border border-ink px-3.5 py-2 text-[14px] font-semibold">Factory view</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1060px] px-5 py-14">
        <h1 className="disp max-w-[16ch] text-[44px] leading-[1.02] sm:text-[60px]">Find the right factory. Run every order in one place.</h1>
        <p className="mt-5 text-[16px] text-ink-2">This is a working demo. Pick a side and click through.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Link href="/brand" className="rounded-[14px] border border-line-2 bg-white p-7 hover:border-ink">
            <p className="monocap text-flame">For brands</p>
            <p className="mt-2 text-[24px] font-bold">I want to make a product</p>
            <p className="mt-1 text-[14px] text-ink-2">Post a requirement, compare verified factories, track your order.</p>
          </Link>
          <Link href="/factory" className="rounded-[14px] bg-pine p-7 text-white">
            <p className="monocap text-apricot">For manufacturers</p>
            <p className="mt-2 text-[24px] font-bold">I run a factory</p>
            <p className="mt-1 text-[14px] text-white/75">Manage enquiries from any source and see your capacity.</p>
          </Link>
          <Link href="/supplier" className="rounded-[14px] border border-line-2 bg-white p-7 hover:border-ink">
            <p className="monocap text-flame">For suppliers</p>
            <p className="mt-2 text-[24px] font-bold">I supply packaging or raw material</p>
            <p className="mt-1 text-[14px] text-ink-2">Every RFQ from every platform in one list, POs, dispatch and payments.</p>
          </Link>
          <Link href="/distributor" className="rounded-[14px] bg-pine p-7 text-white">
            <p className="monocap text-apricot">For distributors</p>
            <p className="mt-2 text-[24px] font-bold">I distribute to retailers</p>
            <p className="mt-1 text-[14px] text-white/75">Receive stock, run retailer orders and routes, collect payments.</p>
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 text-[13px] text-ink-2">
          <Link href="/marketplace" className="font-semibold text-ink underline">Open the marketplace</Link>
          <Link href="/os" className="font-semibold text-ink underline">Scouthru OS for factories</Link>
          <button onClick={reset} className="underline">Reset demo data</button>
        </div>
        <p className="mt-6 max-w-[70ch] text-[12px] text-ink-3">All companies, units and figures are invented for this demo. Your clicks are saved in this browser only.</p>
      </main>
    </div>
  );
}
