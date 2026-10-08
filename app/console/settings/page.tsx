"use client";

import { useState } from "react";
import { Download, RotateCcw, Save } from "lucide-react";
import { Btn, CardTitle, Field, Modal, inputCls } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { download } from "@/lib/console/format";

/** No mockup for Settings: profile, workspace name and demo data, in the console style. */
export default function SettingsPage() {
  const { s, update, reset, toast } = useConsole();
  const [name, setName] = useState(s.user.name);
  const [role, setRole] = useState(s.user.role);
  const [email, setEmail] = useState(s.user.email);
  const [workspace, setWorkspace] = useState(s.workspace);
  const [confirm, setConfirm] = useState(false);
  const dirty = name !== s.user.name || role !== s.user.role || email !== s.user.email || workspace !== s.workspace;

  return (
    <div className="px-[29px] pb-[30px] pt-[26px]">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2b302d]">WORKSPACE</p>
      <h1 className="serif mt-[10px] text-[45px] font-semibold leading-none tracking-[-0.02em]">Settings</h1>
      <p className="mt-[12px] text-[16px] text-[#3e4440]">Your profile, workspace name and demo data.</p>

      <div className="mt-[24px] grid max-w-[980px] gap-[14px] min-[1024px]:grid-cols-2">
        <section className="cs-card p-[18px]">
          <CardTitle sub="Shown in the top bar and on everything you do.">Profile</CardTitle>
          <form
            className="mt-[16px] space-y-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !workspace.trim()) return;
              update((d) => { d.user.name = name.trim(); d.user.role = role.trim(); d.user.email = email.trim(); d.workspace = workspace.trim(); });
              toast("Settings saved");
            }}
          >
            <Field label="Full name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Role"><input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} /></Field>
            <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Workspace name"><input className={inputCls} value={workspace} onChange={(e) => setWorkspace(e.target.value)} required /></Field>
            <Btn type="submit" kind="primary" icon={Save} disabled={!dirty}>Save changes</Btn>
          </form>
        </section>

        <section className="cs-card p-[18px]">
          <CardTitle sub="This demo keeps its data in your browser.">Demo data</CardTitle>
          <dl className="mt-[16px] grid grid-cols-2 gap-[8px] text-[13px]">
            {[
              ["Enquiries", s.enquiries.length], ["Samples", s.samples.length], ["Production orders", s.orders.length], ["Quality batches", s.quality.length],
              ["Shipments", s.shipments.length], ["Payment schedules", s.payments.length], ["Products", s.products.length], ["Manufacturers", s.manufacturers.length],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-[7px] border border-cs-line px-[11px] py-[8px]"><dt className="text-cs-ink-2">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <Btn icon={Download} onClick={() => download(`scouthru-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(s, null, 2), "application/json")}>Export all data</Btn>
            <Btn kind="danger" icon={RotateCcw} onClick={() => setConfirm(true)}>Reset demo data</Btn>
          </div>
        </section>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        sub="Every enquiry, sample, order, payment and note goes back to the starting data. This can't be undone."
        footer={<><Btn onClick={() => setConfirm(false)}>Cancel</Btn><Btn kind="danger" icon={RotateCcw} onClick={() => { reset(); setConfirm(false); }}>Reset data</Btn></>}
      >
        <p className="text-[13px] text-cs-ink-2">Use this before a fresh demo walkthrough.</p>
      </Modal>
    </div>
  );
}
