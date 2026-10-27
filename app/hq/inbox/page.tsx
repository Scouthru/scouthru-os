"use client";

import { useState } from "react";
import { CheckCheck, Eye, FileText, Inbox, Sparkles, Trash2 } from "lucide-react";
import { Btn, inputCls } from "@/components/console/kit";
import { Box, DropZone, FilePreview, MemberPick } from "@/components/hq/ui";
import { PHOTO_KINDS, REQUIRED_DOCS } from "@/lib/hq/rules";
import { guessKind, useHq } from "@/lib/hq/store";
import { fmtSize } from "@/lib/hq/files";
import type { InboxItem } from "@/lib/hq/types";
import { ago } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/** Inbox: everything coming in lands here first, then gets filed to a member in one click. */
export default function InboxPage() {
  const { s, toInbox, fileItem, discard, update } = useHq();
  const [preview, setPreview] = useState<InboxItem | null>(null);
  const ready = s.inbox.filter((it) => it.memberId && it.kind);
  const filed = s.activity.filter((a) => a.text.includes(" filed for ")).slice(0, 6);

  const set = (id: string, patch: Partial<InboxItem>) => update((d) => { Object.assign(d.inbox.find((x) => x.id === id)!, patch); });

  return (
    <div className="grid gap-[16px]">
      <div>
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Inbox</h1>
        <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Everything coming in lands here first: documents, photos, WhatsApp screenshots. HQ suggests who it&apos;s for and what it is; you file it in one click.</p>
      </div>

      <DropZone big onFiles={(files) => toInbox(files)} label="Drop anything here" hint="or click to choose · you can also paste a screenshot with Ctrl+V anywhere in HQ" />

      <Box title={s.inbox.length ? `${s.inbox.length} to file` : "All filed"} icon={Inbox}
        right={ready.length > 1 ? <Btn kind="primary" icon={CheckCheck} onClick={() => ready.forEach((it) => fileItem(it.id, it.memberId!, it.kind!))}>File all {ready.length} suggested</Btn> : undefined}>
        {s.inbox.length === 0 ? <p className="py-[18px] text-center text-[13px] text-cs-ink-2">Nothing waiting. Drop files above, or anywhere in HQ.</p> : (
          <ul className="divide-y divide-cs-line">
            {s.inbox.map((it) => {
              const m = s.members.find((x) => x.id === it.memberId);
              const image = it.type.startsWith("image/");
              const kinds = m ? [...(image ? PHOTO_KINDS[m.type] : []), ...REQUIRED_DOCS[m.type], "Other"] : [];
              return (
                <li key={it.id} className="grid items-center gap-[10px] py-[12px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                  <button type="button" onClick={() => setPreview(it)} className="group flex min-w-0 items-center gap-[11px] text-left">
                    <span className="grid size-[48px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[#f3f0e9]">
                      {it.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.thumb} alt="" className="size-full object-cover" />
                      ) : <FileText className="size-[20px] text-cs-ink-2" strokeWidth={1.6} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium group-hover:text-cs-green">{it.name}</span>
                      <span className="flex items-center gap-[5px] text-[11.5px] text-cs-ink-2"><Eye className="size-[12px]" />{fmtSize(it.size)} · {ago(it.at)}</span>
                    </span>
                  </button>
                  <div className="min-w-0">
                    <MemberPick value={it.memberId ?? ""} placeholder="Whose is this?" onChange={(id) => set(it.id, { memberId: id || undefined, kind: guessKind(s, it, id || undefined) })} />
                  </div>
                  <select className={cn(inputCls, !m && "opacity-50")} disabled={!m} value={it.kind ?? ""} onChange={(e) => set(it.id, { kind: e.target.value })} aria-label="What is it">
                    {!m && <option value="">What is it?</option>}
                    {kinds.map((k) => <option key={k}>{k}</option>)}
                  </select>
                  <div className="flex items-center gap-[8px]">
                    <Btn kind="primary" disabled={!it.memberId || !it.kind} onClick={() => fileItem(it.id, it.memberId!, it.kind!)}>File</Btn>
                    <button type="button" onClick={() => discard(it.id)} aria-label={`Discard ${it.name}`} className="grid size-[36px] place-items-center rounded-[7px] text-cs-ink-2 hover:bg-cs-red-bg hover:text-cs-red"><Trash2 className="size-[16px]" /></button>
                  </div>
                  {it.memberId && it.kind && <p className="flex items-center gap-[5px] text-[11.5px] text-cs-green-2 lg:col-span-4"><Sparkles className="size-[12px]" />Suggested: {it.kind} for {m?.name}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Box>

      {filed.length > 0 && (
        <Box title="Recently filed" icon={CheckCheck}>
          <ul className="grid gap-[6px] md:grid-cols-2">
            {filed.map((a) => <li key={a.id} className="text-[12.5px]">{a.text} <span className="text-cs-ink-2">· {ago(a.at)}</span></li>)}
          </ul>
        </Box>
      )}

      {preview && <FilePreview file={{ fileKey: preview.fileKey || undefined, name: preview.name, thumb: preview.thumb, title: "Inbox" }} onClose={() => setPreview(null)} />}
    </div>
  );
}
