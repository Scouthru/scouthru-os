"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import { PostRequirement } from "./market";
import { Toasts } from "./kit";
import { useConsole } from "@/lib/console/store";

export function SiteLogo({ light }: { light?: boolean }) {
  return <span className={`serif text-[30px] font-semibold leading-none tracking-[-0.02em] ${light ? "text-white" : "text-cs-green"}`}>Scouthru</span>;
}

const LINKS: [string, string][] = [["Marketplace", "/marketplace"], ["Scouthru OS", "/os"], ["Portals", "/demo"], ["Pricing", "/#pricing"]];

/** Header for the website pages: logo, links, log in, post a requirement. */
export function SiteHeader() {
  const [post, setPost] = useState(false);
  const [open, setOpen] = useState(false);
  const { toasts } = useConsole();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-cs-line bg-cs-ground/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-[14px]">
          <Link href="/" aria-label="Scouthru home"><SiteLogo /></Link>
          <nav className="hidden gap-[28px] text-[14.5px] font-medium text-[#2f3431] md:flex">
            {LINKS.map(([l, h]) => <Link key={l} href={h} className="hover:text-cs-green">{l}</Link>)}
          </nav>
          <div className="flex items-center gap-[10px]">
            <Link href="/demo" className="hidden px-2 py-2 text-[14.5px] font-medium hover:text-cs-green sm:block">Log in</Link>
            <button type="button" onClick={() => setPost(true)} className="hidden h-[42px] rounded-[8px] bg-cs-green px-[18px] text-[14px] font-medium text-white hover:bg-[#8f3a18] sm:block">Post a requirement</button>
            <button type="button" aria-label="Menu" onClick={() => setOpen((o) => !o)} className="grid size-[40px] place-items-center rounded-[8px] border border-cs-line bg-white md:hidden">{open ? <X className="size-[18px]" /> : <MenuIcon className="size-[18px]" />}</button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-cs-line px-5 py-[10px] md:hidden">
            {LINKS.map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="block py-[9px] text-[15px] font-medium">{l}</Link>)}
            <Link href="/demo" className="block py-[9px] text-[15px] font-medium">Log in</Link>
            <button type="button" onClick={() => { setOpen(false); setPost(true); }} className="mt-[6px] h-[42px] w-full rounded-[8px] bg-cs-green text-[14px] font-medium text-white">Post a requirement</button>
          </nav>
        )}
      </header>
      {post && <PostRequirement open onClose={() => setPost(false)} />}
      <Toasts toasts={toasts} />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-cs-deep text-white/80">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6 px-5 py-[44px] text-[14px]">
        <div className="space-y-[8px]"><SiteLogo light /><p className="text-white/75">From idea to delivery, Scouthru&apos;s got you.</p></div>
        <nav className="flex flex-wrap items-center gap-[22px]">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/os" className="hover:text-white">Scouthru OS</Link>
          <Link href="/demo" className="hover:text-white">Portals</Link>
          <Link href="/console" className="hover:text-white">Open the console</Link>
          <span className="text-white/60">Hyderabad, India</span>
        </nav>
      </div>
    </footer>
  );
}
