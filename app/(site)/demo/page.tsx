"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Factory, PackageOpen, RotateCcw, Store, Warehouse } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/console/site";
import { Btn, Modal } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";

/** Pick a portal: the four sides of the same demo network. */
export default function Demo() {
  const { s, reset } = useConsole();
  const [confirm, setConfirm] = useState(false);
  const maker = s.manufacturers.find((m) => m.id === s.makerId)?.name ?? "Manufacturer";
  const supplier = s.suppliers.find((x) => x.id === s.supplierId)?.name ?? "Supplier";
  const ROLES: [string, string, string, string, string, typeof Store][] = [
    ["For brands", "I want to make a product", `${s.workspace} · post enquiries, approve samples, track batches, pay by milestone.`, "/console", s.user.name, Store],
    ["For manufacturers", "I run a factory", `${maker} · quote enquiries, plan capacity, run batches and dispatch.`, "/console/maker", s.people.maker.name, Factory],
    ["For suppliers", "I supply packaging or raw material", `${supplier} · answer RFQs, ship purchase orders, keep stock and prices current.`, "/console/supplier", s.people.supplier.name, PackageOpen],
    ["For distributors", "I distribute to retailers", `${s.distributor.name} · receive stock, run retailer orders and routes, collect payments.`, "/console/distributor", s.people.distributor.name, Warehouse],
  ];

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-5 py-[56px]">
        <p className="text-[11.5px] font-semibold tracking-[0.2em] text-cs-green-2">WORKING DEMO</p>
        <h1 className="serif mt-[14px] max-w-[18ch] text-[44px] font-semibold leading-[1.03] tracking-[-0.025em] sm:text-[56px]">Find the right factory. Run every order in one place.</h1>
        <p className="mt-[14px] text-[16px] text-[#3e4440]">Pick a side and click through. All four portals share one network, so what you do on one side shows up on the others.</p>
        <div className="mt-[28px] grid gap-[14px] md:grid-cols-2">
          {ROLES.map(([k, t, d, href, who, Icon], i) => (
            <Link key={k} href={href} className={i % 3 === 0 ? "group flex flex-col gap-[8px] rounded-[14px] bg-cs-deep p-[26px] text-white" : "cs-card group flex flex-col gap-[8px] p-[26px] hover:border-[#cfcac0]"}>
              <div className="flex items-center justify-between">
                <span className={i % 3 === 0 ? "text-[11.5px] font-semibold tracking-[0.18em] text-[#f2c4ad]" : "text-[11.5px] font-semibold tracking-[0.18em] text-cs-green-2"}>{k.toUpperCase()}</span>
                <Icon className={i % 3 === 0 ? "size-[22px] text-[#f2c4ad]" : "size-[22px] text-cs-green-2"} strokeWidth={1.6} />
              </div>
              <p className="serif text-[27px] font-semibold leading-tight">{t}</p>
              <p className={i % 3 === 0 ? "text-[14px] text-white/80" : "text-[14px] text-[#3e4440]"}>{d}</p>
              <span className={i % 3 === 0 ? "mt-[6px] inline-flex items-center gap-[6px] text-[13.5px] font-medium text-white" : "mt-[6px] inline-flex items-center gap-[6px] text-[13.5px] font-medium text-cs-green"}>Sign in as {who} <ArrowRight className="size-[14px] transition-transform group-hover:translate-x-[3px]" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-[28px] flex flex-wrap items-center gap-[18px] text-[13.5px]">
          <Link href="/marketplace" className="font-medium text-cs-green hover:underline">Open the marketplace</Link>
          <Link href="/os" className="font-medium text-cs-green hover:underline">Scouthru OS for factories</Link>
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-[6px] text-cs-ink-2 hover:text-cs-ink"><RotateCcw className="size-[14px]" />Reset demo data</button>
        </div>
        <p className="mt-[18px] max-w-[70ch] text-[12px] text-cs-ink-2">All companies, people and figures are invented for this demo. Your clicks are saved in this browser only.</p>
      </main>
      <SiteFooter />
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        sub="Every enquiry, sample, order, payment and note in all four portals goes back to the starting data."
        footer={<><Btn onClick={() => setConfirm(false)}>Cancel</Btn><Btn kind="danger" icon={RotateCcw} onClick={() => { reset(); setConfirm(false); }}>Reset data</Btn></>}
      >
        <p className="text-[13px] text-cs-ink-2">Use this before a fresh demo walkthrough.</p>
      </Modal>
    </div>
  );
}
