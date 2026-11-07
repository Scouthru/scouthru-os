"use client";

import { useState } from "react";
import { Camera, Check, FileText, Trash2, X } from "lucide-react";
import { FilePreview, UploadTile } from "./ui";
import { EXPIRING, PHOTO_KINDS, progress } from "@/lib/hq/rules";
import { log, useHq } from "@/lib/hq/store";
import { fmtSize } from "@/lib/hq/files";
import type { Doc, Member } from "@/lib/hq/types";
import { ago, fmtDate } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/**
 * A member's onboarding kit as upload boxes: one box per required document and one per photo
 * (plant, machinery, lab…). Dropping a file on a box saves it as exactly that item.
 * Used on the home page (next to New onboarding) and on each member's file.
 */

const REJECT_REASONS = ["Scan is unreadable", "Expired", "Wrong document", "Name doesn't match the company"];
const STATE_BADGE = {
  approved: ["Approved", "bg-cs-ok-bg text-cs-ok"],
  check: ["To check", "bg-cs-orange-bg text-[#a9713f]"],
  rejected: ["Rejected", "bg-cs-red-bg text-cs-red"],
  missing: ["Missing", "bg-[#f5efe5] text-cs-ink-2"],
} as const;

type Preview = { fileKey?: string; name: string; thumb?: string; title: string };
type CheckItem = ReturnType<typeof progress>["checklist"][number];

/** One box per required document. */
export function DocBoxes({ m, compact }: { m: Member; compact?: boolean }) {
  const { s, addDocs, removeDoc } = useHq();
  const [preview, setPreview] = useState<Preview | null>(null);
  const p = progress(s, m);
  return (
    <>
      <div className={cn("grid gap-[10px]", compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {p.checklist.map((c) => (
          <DocBox key={c.kind} m={m} c={c} compact={compact}
            onFiles={(files) => addDocs(m.id, [{ file: files[0], kind: c.kind }])}
            onOpen={(d) => setPreview({ fileKey: d.fileKey, name: d.name, title: `${d.kind} · ${m.name}` })}
            onRemove={removeDoc} />
        ))}
      </div>
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

/** One box per photo the team needs (front of the plant, machinery, lab…). */
export function PhotoBoxes({ m, compact }: { m: Member; compact?: boolean }) {
  const { s, addPhotos, removePhoto, toast } = useHq();
  const [preview, setPreview] = useState<Preview | null>(null);
  const photos = s.photos.filter((x) => x.memberId === m.id);
  return (
    <>
      <div className={cn("grid gap-[10px]", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
        {PHOTO_KINDS[m.type].map((kind) => {
          const these = photos.filter((x) => x.kind === kind);
          return (
            <UploadTile key={kind} label={kind} tone={these.length ? "approved" : "missing"} accept="image/*" empty={!these.length} compact={compact} icon={Camera}
              onFiles={(files) => addPhotos(m.id, files.map((file) => ({ file, kind })))}>
              <div className="grid grid-cols-2 gap-[4px]">
                {these.slice(0, 4).map((x) => (
                  <div key={x.id} className="group relative aspect-square overflow-hidden rounded-[6px] bg-[#f6f0e6]">
                    <button type="button" onClick={() => setPreview({ fileKey: x.fileKey, name: x.name, thumb: x.thumb, title: `${x.kind} · ${m.name}` })} className="size-full" title="Open">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.thumb} alt={x.kind} className="size-full object-cover" />
                    </button>
                    <button type="button" onClick={() => { removePhoto(x.id); toast("Photo removed", "info"); }} aria-label="Remove photo" className="absolute right-[3px] top-[3px] hidden size-[20px] place-items-center rounded-[5px] bg-white/90 text-cs-red group-hover:grid"><Trash2 className="size-[12px]" /></button>
                  </div>
                ))}
              </div>
              {these.length > 4 && <p className="mt-[4px] text-[11px] text-cs-ink-2">+{these.length - 4} more</p>}
            </UploadTile>
          );
        })}
      </div>
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

/** One required document: drop to upload, then approve or reject the copy on file. */
function DocBox({ m, c, compact, onFiles, onOpen, onRemove }: { m: Member; c: CheckItem; compact?: boolean; onFiles: (files: File[]) => void; onOpen: (d: Doc) => void; onRemove: (id: string) => void }) {
  const { update, toast } = useHq();
  const [validTill, setValidTill] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [label, tone] = STATE_BADGE[c.state];
  const d = c.best;
  const needsDate = EXPIRING.includes(c.kind);

  const approve = () => {
    update((st) => {
      const x = st.docs.find((y) => y.id === d!.id)!;
      x.status = "Approved";
      if (needsDate) x.validTill = validTill;
      log(st, `${x.kind} approved for ${m.name}`, m.id);
    });
    toast(`${c.kind} approved`);
  };
  const reject = (reason: string) => {
    update((st) => {
      const x = st.docs.find((y) => y.id === d!.id)!;
      x.status = "Rejected";
      x.reason = reason;
      log(st, `${x.kind} from ${m.name} rejected: ${reason.toLowerCase()}`, m.id);
    });
    setRejecting(false);
    toast(`${c.kind} rejected`, "info");
  };

  return (
    <UploadTile label={c.kind} tone={c.state} empty={!d} accept=".pdf,image/*" onFiles={onFiles} compact={compact} icon={FileText}>
      {d && (
        <>
          <span className={cn("w-fit rounded-full px-[8px] py-[1px] text-[11px] font-medium", tone)}>{label}</span>
          <button type="button" onClick={() => onOpen(d)} className="mt-[6px] flex min-w-0 items-center gap-[6px] text-left text-[12px] hover:text-cs-green" title="Open">
            <FileText className="size-[14px] shrink-0 text-cs-ink-2" /><span className="truncate underline-offset-2 hover:underline">{d.name}</span>
          </button>
          {!compact && <span className="text-[11px] text-cs-ink-2">{fmtSize(d.size)} · {ago(d.at)}</span>}
          {c.state === "approved" && d.validTill && <span className="mt-[2px] text-[11px] text-cs-ok">Valid till {fmtDate(d.validTill)}</span>}
          {c.state === "rejected" && d.reason && <span className="mt-[2px] text-[11px] text-cs-red">{d.reason} · drop a new copy</span>}
          <div className="mt-auto flex flex-wrap items-center gap-x-[10px] gap-y-[5px] pt-[8px] text-[12px]">
            {c.state === "check" && !rejecting && (
              <>
                {needsDate && <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className="h-[28px] w-full rounded-[6px] border border-cs-line bg-white px-[6px] text-[11.5px]" aria-label="Valid till" title="Valid till (needed to approve)" />}
                <button type="button" disabled={needsDate && !validTill} onClick={approve} className="inline-flex items-center gap-[3px] font-medium text-cs-ok hover:underline disabled:opacity-40 disabled:no-underline" title={needsDate && !validTill ? "Enter the valid-till date first" : undefined}><Check className="size-[13px]" />Approve</button>
                <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-[3px] text-cs-red hover:underline"><X className="size-[13px]" />Reject</button>
              </>
            )}
            {rejecting && (
              <span className="flex flex-wrap items-center gap-[4px]">
                {REJECT_REASONS.map((r) => <button key={r} type="button" onClick={() => reject(r)} className="rounded-full border border-cs-red/40 bg-white px-[7px] py-[1px] text-[11px] text-cs-red hover:bg-cs-red-bg">{r}</button>)}
                <button type="button" onClick={() => setRejecting(false)} className="text-[11px] text-cs-ink-2 hover:underline">Cancel</button>
              </span>
            )}
            <button type="button" onClick={() => onRemove(d.id)} aria-label={`Remove ${d.name}`} className="ml-auto text-cs-ink-2 hover:text-cs-red"><Trash2 className="size-[14px]" /></button>
          </div>
        </>
      )}
    </UploadTile>
  );
}
