"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Home, LogOut, Menu as Menu2, RotateCcw, Search, Settings, Store, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConsole } from "@/lib/console/store";
import { useAccount } from "@/lib/console/account";
import { Btn, Menu, Modal, Toasts } from "./kit";
import { NAVS, PHONE_NAV, PORTAL_HOME, PORTAL_ICON, PORTAL_LABEL, PORTAL_PROMO, orgName, portalOf } from "./portals";
import type { ConsoleState, Portal } from "@/lib/console/types";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "./notifications";

const NAV = NAVS.brand;

/** Bottom-left promo card copy and photo, per section, as in the mockups. */
const PROMO: Record<string, { title: string; text: string; img: string; href: string }> = {
  "/console": { title: "Better sourcing together.", text: "From idea to market with Scouthru OS.", img: "/console/promo-dashboard.jpg", href: "/console/enquiries?new=1" },
  "/console/enquiries": { title: "Better sourcing together.", text: "From idea to market with Scouthru OS.", img: "/console/promo-enquiries.jpg", href: "/console/enquiries?new=1" },
  "/console/manufacturers": { title: "Better manufacturing partners. Stronger brands.", text: "From idea to market with Scouthru OS.", img: "/console/promo-manufacturers.jpg", href: "/console/enquiries?new=1" },
  "/console/samples": { title: "Better products start with great samples.", text: "Validate quality, refine faster, launch with confidence.", img: "/console/promo-samples.jpg", href: "/console/samples" },
  "/console/production": { title: "Better manufacturing partners. Stronger brands.", text: "", img: "/console/promo-production.jpg", href: "/console/manufacturers" },
  "/console/quality": { title: "Quality today. Stronger brands tomorrow.", text: "From formulation to final product with Scouthru OS.", img: "/console/promo-quality.jpg", href: "/console/quality" },
  "/console/shipments": { title: "Global manufacturing made simpler.", text: "From production to doorstep with Scouthru OS.", img: "/console/promo-shipments.jpg", href: "/console/shipments" },
  "/console/payments": { title: "Stronger partnerships build brighter brands.", text: "Transparent payments for a healthier tomorrow.", img: "/console/promo-payments.jpg", href: "/console/payments" },
  "/console/products": { title: "Better products start with great samples.", text: "Validate quality, refine faster, launch with confidence.", img: "/console/promo-products.jpg", href: "/console/samples" },
  "/console/reports": { title: "Better insights build stronger supply chains.", text: "Data-driven decisions for a healthier, more connected world.", img: "/console/promo-reports.jpg", href: "/console/reports" },
};

/**
 * The mockups are drawn at 1448px wide. Between laptop width and that, scale the
 * whole console down so it keeps the mockup's arrangement instead of reflowing.
 */
const DESIGN_W = 1448;
function useFitZoom() {
  const [z, setZ] = useState(1);
  useEffect(() => {
    const fit = () => {
      const w = document.documentElement.clientWidth;
      setZ(w >= 1024 && w < DESIGN_W ? Math.max(0.7, w / DESIGN_W) : 1);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return z;
}

type Hit = { kind: string; title: string; sub: string; href: string; img?: string };

const SEARCH_HINT: Record<Portal, string> = {
  brand: "Search enquiries, manufacturers, products, or anything...",
  maker: "Search enquiries, samples, orders, materials...",
  supplier: "Search requests, purchase orders, stock...",
  distributor: "Search stock, retailer orders, inbound shipments...",
};

/** Search results for the portal you're in; each links to that portal's own screens. */
function searchHits(s: ConsoleState, portal: Portal, q: string): Hit[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const m = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(t));
  const mfr = (id: string) => s.manufacturers.find((x) => x.id === id)?.name ?? "";
  if (portal === "maker") {
    const mine = s.enquiries.filter((e) => e.responses.some((r) => r.mfrId === s.makerId));
    return [
      ...mine.filter((e) => m(e.name, e.id)).map((e) => ({ kind: "Enquiry", title: e.name, sub: `${e.id} · ${e.stage}`, href: `/console/maker/enquiries?id=${e.id}`, img: e.img })),
      ...s.samples.filter((x) => x.mfrId === s.makerId && m(x.name, x.id)).map((x) => ({ kind: "Sample", title: x.name, sub: `${x.id} · ${x.status}`, href: `/console/maker/samples?id=${x.id}`, img: x.img })),
      ...s.orders.filter((o) => o.mfrId === s.makerId && m(o.name, o.id)).map((o) => ({ kind: "Order", title: o.name, sub: o.id, href: `/console/maker/orders?id=${o.id}`, img: o.img })),
      ...s.purchaseOrders.filter((p) => p.mfrId === s.makerId && m(p.title, p.id)).map((p) => ({ kind: "Material", title: p.title, sub: `${p.id} · ${p.status}`, href: `/console/maker/materials?id=${p.id}` })),
    ].slice(0, 9);
  }
  if (portal === "supplier") {
    return [
      ...s.purchaseOrders.filter((p) => p.supplierId === s.supplierId && m(p.title, p.id, mfr(p.mfrId))).map((p) => {
        const req = p.status === "RFQ" || p.status === "Quoted";
        return { kind: req ? "Request" : "PO", title: p.title, sub: `${p.id} · ${mfr(p.mfrId)} · ${p.status}`, href: `/console/supplier/${req ? "requests" : "pos"}?id=${p.id}` };
      }),
      ...s.supplierStock.filter((x) => m(x.name, x.sku)).map((x) => ({ kind: "Stock", title: x.name, sub: `${x.sku} · ${x.onHand.toLocaleString("en-US")} ${x.unit}`, href: `/console/supplier/stock?sku=${x.sku}` })),
    ].slice(0, 9);
  }
  if (portal === "distributor") {
    return [
      ...s.distStock.filter((x) => m(x.product, x.sku)).map((x) => ({ kind: "Stock", title: x.product, sub: `${x.sku} · ${x.onHand} on hand`, href: `/console/distributor/stock?sku=${x.sku}`, img: x.img })),
      ...s.retailOrders.filter((o) => m(o.retailer, o.id, o.area)).map((o) => ({ kind: "Order", title: o.retailer, sub: `${o.id} · ${o.status}`, href: `/console/distributor/orders?id=${o.id}` })),
      ...s.shipments.filter((x) => x.destination.includes(s.distributor.city) && m(x.id, x.name)).map((x) => ({ kind: "Inbound", title: `${x.id} · ${x.name}`, sub: x.status, href: `/console/distributor/inbound?id=${x.id}`, img: x.img })),
    ].slice(0, 9);
  }
  return [
    ...s.enquiries.filter((e) => m(e.name, e.id, e.category)).map((e) => ({ kind: "Enquiry", title: e.name, sub: `${e.id} · ${e.stage}`, href: `/console/enquiries?id=${e.id}`, img: e.img })),
    ...s.manufacturers.filter((x) => m(x.name, x.state, x.capabilities.join(" "))).map((x) => ({ kind: "Manufacturer", title: x.name, sub: `${x.state}, India · ★ ${x.rating}`, href: `/console/manufacturers?id=${x.id}`, img: x.img })),
    ...s.products.filter((p) => m(p.name, p.id)).map((p) => ({ kind: "Product", title: p.name, sub: `${p.id} · ${p.stage}`, href: `/console/products?id=${p.id}`, img: p.img })),
    ...s.samples.filter((x) => m(x.name, x.id)).map((x) => ({ kind: "Sample", title: x.name, sub: `${x.id} · ${x.status} · ${mfr(x.mfrId)}`, href: `/console/samples?id=${x.id}`, img: x.img })),
    ...s.orders.filter((o) => m(o.name, o.id)).map((o) => ({ kind: "Order", title: o.name, sub: `${o.id} · ${mfr(o.mfrId)}`, href: `/console/production?id=${o.id}`, img: o.img })),
    ...s.shipments.filter((x) => m(x.name, x.id, x.destination)).map((x) => ({ kind: "Shipment", title: `${x.id} · ${x.name}`, sub: `${x.status} · ${x.destination}`, href: `/console/shipments?id=${x.id}`, img: x.img })),
  ].slice(0, 9);
}

function GlobalSearch({ portal }: { portal: Portal }) {
  const { s } = useConsole();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", out);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", out); };
  }, []);

  const hits = useMemo<Hit[]>(() => searchHits(s, portal, q), [q, s, portal]);

  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };

  return (
    <div ref={box} className="relative w-full min-w-0 max-w-[620px]">
      <form
        className="flex h-[41px] items-center gap-[10px] rounded-[9px] border border-cs-line bg-white px-[14px] focus-within:border-cs-green-2/60"
        onSubmit={(e) => { e.preventDefault(); if (hits[cursor]) go(hits[cursor]); }}
      >
        <Search className="size-[18px] text-cs-ink-2" strokeWidth={1.7} />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setCursor(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(hits.length - 1, c + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
            if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
          }}
          placeholder={SEARCH_HINT[portal]}
          aria-label="Search the workspace"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#7d7167]"
        />
        <kbd className="hidden rounded-[5px] border sm:inline border-cs-line bg-[#f9f6f0] px-[7px] py-[2px] font-sans text-[11px] text-cs-ink-2">⌘ K</kbd>
      </form>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-[46px] z-50 overflow-hidden rounded-[10px] border border-cs-line bg-white py-[6px] shadow-[0_12px_32px_rgba(60,40,25,0.14)]">
          {hits.length === 0 && <p className="px-[14px] py-[12px] text-[13px] text-cs-ink-2">Nothing matches “{q}”.</p>}
          {hits.map((h, i) => (
            <button key={h.kind + h.href} type="button" onMouseEnter={() => setCursor(i)} onClick={() => go(h)} className={cn("flex w-full items-center gap-[11px] px-[14px] py-[8px] text-left", i === cursor && "bg-[#f8f3eb]")}>
              {h.img ? <Image src={h.img} alt="" width={34} height={34} className="size-[34px] rounded-[6px] object-cover" /> : <span className="size-[34px] rounded-[6px] bg-cs-mint" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{h.title}</span>
                <span className="block truncate text-[11.5px] text-cs-ink-2">{h.sub}</span>
              </span>
              <span className="rounded-[4px] bg-[#f6f0e7] px-[7px] py-[2px] text-[10.5px] text-cs-ink-2">{h.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { s, reset, toasts } = useConsole();
  const { signOut } = useAccount();
  const [confirmReset, setConfirmReset] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [path]);
  const portal = portalOf(path);
  const nav = NAVS[portal];
  const section = path.startsWith("/console/settings") ? "/console/settings" : nav.slice(1).find((n) => path === n.href || path.startsWith(n.href + "/"))?.href ?? nav[0].href;
  const promo = portal === "brand" ? PROMO[section] ?? PROMO["/console"] : PORTAL_PROMO[portal];
  const person = portal === "brand" ? s.user : s.people[portal];
  const PortalIcon = PORTAL_ICON[portal];
  const z = useFitZoom();

  return (
    <div className="flex min-h-dvh" style={z < 1 ? { zoom: z } : undefined}>
      <aside style={z < 1 ? { height: `calc(100dvh / ${z})` } : undefined} className="sticky top-0 hidden h-dvh w-[205px] shrink-0 flex-col overflow-y-auto border-r border-cs-line bg-cs-ground lg:flex">
        <Link href={PORTAL_HOME[portal]} className="flex h-[68px] shrink-0 flex-col justify-center pl-[23px]">
          <span className="flex items-center gap-2">
            <BrandMark className="h-[30px] text-cs-green" />
            <span className="serif text-[14px] text-cs-ink-2">OS</span>
          </span>
          {portal !== "brand" && <span className="mt-[3px] text-[10.5px] font-semibold tracking-[0.16em] text-cs-green-2">{PORTAL_LABEL[portal].toUpperCase()} PORTAL</span>}
        </Link>
        <nav className="mt-[16px] px-[20px]" aria-label="Console">
          {nav.map(({ href, label, icon: Icon }) => {
            const on = section === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn("mb-[6px] flex h-[38px] items-center gap-[13px] rounded-[6px] px-[12px] text-[14px]", on ? "bg-cs-green font-medium text-white" : "text-[#36312d] hover:bg-cs-cream")}
              >
                <Icon className="size-[18px]" strokeWidth={1.6} />
                {label}
              </Link>
            );
          })}
          <div className="my-[14px] border-t border-cs-line" />
          <Link href="/console/settings" className={cn("flex h-[38px] items-center gap-[13px] rounded-[6px] px-[12px] text-[14px]", section === "/console/settings" ? "bg-cs-green text-white" : "text-[#36312d] hover:bg-cs-cream")}>
            <Settings className="size-[18px]" strokeWidth={1.6} />
            Settings
          </Link>
        </nav>
        <div className="mt-auto px-[23px] pb-[54px] [@media(max-height:960px)]:pb-[20px] [@media(max-height:640px)]:hidden">
          <div className="overflow-hidden rounded-[10px] bg-cs-cream">
            <Image src={promo.img} alt="" width={332} height={304} className="h-[152px] w-full object-cover [@media(max-height:860px)]:h-[96px]" priority />
            <div className="px-[16px] pb-[18px] pt-[4px]">
              <p className="serif text-[21px] font-semibold leading-[1.08] text-cs-ink">{promo.title}</p>
              {promo.text && <p className="mt-[8px] text-[13px] leading-[1.35] text-[#443d37]">{promo.text}</p>}
              <Link href={promo.href} aria-label="Get started" className="mt-[12px] grid size-[37px] place-items-center rounded-full bg-cs-green text-white hover:bg-[#7c2c14]">
                <ArrowRight className="size-[17px]" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-cs-line bg-cs-ground px-[12px] sm:gap-4 lg:pl-[28px] lg:pr-[26px]">
          {/* Phones open the full menu from More in the bottom bar. */}
          <GlobalSearch portal={portal} />
          <div className="ml-auto flex shrink-0 items-center gap-[10px] sm:gap-[18px] min-[1024px]:gap-[30px]">
            <Menu
              align="right"
              items={[
                ...(["brand", "maker", "supplier", "distributor"] as Portal[]).map((p) => ({ label: `${PORTAL_LABEL[p]} · ${orgName(s, p)}${p === portal ? " ✓" : ""}`, icon: PORTAL_ICON[p], onClick: () => router.push(PORTAL_HOME[p]) })),
                "sep" as const,
                { label: "Reset demo data", icon: RotateCcw, onClick: () => setConfirmReset(true) },
                { label: "Browse marketplace", icon: Store, onClick: () => router.push("/marketplace") },
              ]}
              trigger={
                <button type="button" aria-label="Workspace menu" className="flex h-[41px] items-center gap-[10px] whitespace-nowrap rounded-[9px] border border-cs-line bg-white px-[11px] text-[13.5px] font-medium hover:border-[#d0c7bf] md:w-auto md:min-w-[194px] md:max-w-[250px] md:px-[12px]">
                  <PortalIcon className="size-[18px]" strokeWidth={1.6} />
                  <span className="hidden truncate md:inline">{orgName(s, portal)}</span>
                  <ChevronDown className="ml-auto hidden size-[16px] text-cs-ink-2 md:block" />
                </button>
              }
            />
            <NotificationBell portal={portal} />
            <Menu
              align="right"
              items={[
                { label: "Settings", icon: Settings, onClick: () => router.push("/console/settings") },
                { label: "Sign out", icon: LogOut, onClick: () => { signOut(); router.push("/marketplace"); } },
              ]}
              trigger={
                <button type="button" className="flex items-center gap-[12px] rounded-[8px] hover:opacity-90">
                  {person.img ? <Image src={person.img} alt="" width={44} height={44} className="size-[44px] rounded-full" /> : <span className="grid size-[44px] place-items-center rounded-full bg-cs-mint text-[14px] font-semibold text-cs-green">{person.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>}
                  <span className="hidden whitespace-nowrap text-left leading-tight md:block">
                    <span className="block text-[13.5px] font-semibold">{person.name}</span>
                    <span className="block text-[12px] text-cs-ink-2">{person.role}</span>
                  </span>
                  <ChevronDown className="ml-[10px] hidden size-[16px] text-cs-ink-2 md:block" />
                </button>
              }
            />
          </div>
        </header>
        <main className="pb-[76px] lg:pb-0">{children}</main>
      </div>

      {/* Phones and tablets: the four main places plus More (the full menu). */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-cs-line bg-cs-ground/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {PHONE_NAV[portal].map((href) => {
          const item = nav.find((n) => n.href === href);
          if (!item) return null;
          const on = section === href;
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("flex h-[62px] flex-col items-center justify-center gap-[3px] text-[11px]", on ? "font-semibold text-cs-green" : "text-[#5f564e]")}>
              <item.icon className="size-[21px]" strokeWidth={on ? 2 : 1.6} />
              <span className="max-w-full truncate px-[2px]">{href === PORTAL_HOME[portal] ? "Home" : item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} aria-label="More pages" className={cn("flex h-[62px] flex-col items-center justify-center gap-[3px] text-[11px]", !PHONE_NAV[portal].includes(section) ? "font-semibold text-cs-green" : "text-[#5f564e]")}>
          <Menu2 className="size-[21px]" strokeWidth={1.6} />
          <span>More</span>
        </button>
      </nav>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-[#221e1b]/40" />
          <nav aria-label="Console" onMouseDown={(e) => e.stopPropagation()} className="absolute inset-y-0 left-0 w-[260px] overflow-y-auto bg-cs-ground px-[16px] py-[18px] shadow-[0_0_40px_rgba(0,0,0,0.2)]">
            <div className="mb-[14px] flex items-center justify-between pl-[6px]">
              <span className="flex items-center gap-2"><BrandMark className="h-[28px] text-cs-green" /><span className="serif text-[13px] text-cs-ink-2">OS</span></span>
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="grid size-[34px] place-items-center rounded-[7px] hover:bg-cs-cream"><X className="size-[18px]" /></button>
            </div>
            {[...nav, { href: "/console/settings", label: "Settings", icon: Settings }].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={cn("mb-[4px] flex h-[42px] items-center gap-[13px] rounded-[7px] px-[12px] text-[14.5px]", section === href ? "bg-cs-green font-medium text-white" : "text-[#36312d] hover:bg-cs-cream")}>
                <Icon className="size-[18px]" strokeWidth={1.6} />{label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        sub="Every enquiry, sample, order, payment and note goes back to the starting data. This can't be undone."
        footer={<><Btn onClick={() => setConfirmReset(false)}>Cancel</Btn><Btn kind="danger" icon={RotateCcw} onClick={() => { reset(); setConfirmReset(false); router.push(PORTAL_HOME[portal]); }}>Reset data</Btn></>}
      >
        <p className="text-[13px] text-cs-ink-2">Use this before a fresh demo walkthrough.</p>
      </Modal>
      <Toasts toasts={toasts} />
    </div>
  );
}
