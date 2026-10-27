import type { Doc, HqState, Member, Photo } from "./types";

export const HQ_VERSION = 3;

const D = 864e5;

/** Example members, one or more at each stage of onboarding. All companies and numbers are invented. */
export function hqSeed(now = Date.now()): HqState {
  const at = (days: number) => new Date(now - days * D).toISOString();
  const day = (offset: number) => new Date(now + offset * D).toISOString().slice(0, 10);

  const m = (x: Omit<Member, "notes" | "createdAt" | "autoRemind"> & { daysAgo: number; notes?: Member["notes"]; autoRemind?: boolean }): Member => {
    const { daysAgo, notes, autoRemind, ...rest } = x;
    return { ...rest, createdAt: at(daysAgo), notes: notes ?? [], autoRemind: autoRemind ?? true };
  };

  const members: Member[] = [
    m({ id: "m-coastal", name: "Coastal Health Distributors", type: "distributor", city: "Kochi", state: "Kerala", contactRole: "Operations head", phone: "9847012345", email: "ops@coastalhealth.example", daysAgo: 0.2 }),
    m({ id: "m-vardhman", name: "Vardhman Labels", type: "supplier", city: "Ludhiana", state: "Punjab", contactRole: "Owner", phone: "9814012345", email: "info@vardhmanlabels.example", daysAgo: 6 }),
    m({ id: "m-greenroot", name: "GreenRoot Foods", type: "brand", city: "Bengaluru", state: "Karnataka", contactRole: "Founder", phone: "9886012345", email: "hello@greenroot.example", daysAgo: 8 }),
    m({ id: "m-balaji", name: "Sri Balaji Nutraceuticals", type: "maker", city: "Hyderabad", state: "Telangana", contactRole: "Plant head", phone: "9848012345", email: "plant@sribalaji.example", daysAgo: 9,
      visit: { date: day(2), done: false, checks: {}, notes: "" }, notes: [{ at: at(8), text: "Capsule and tablet lines. Wants large-lot leads." }] }),
    m({ id: "m-nilgiri", name: "Nilgiri Fresh Distributors", type: "distributor", city: "Coimbatore", state: "Tamil Nadu", contactRole: "Partner", phone: "9843012345", email: "partner@nilgirifresh.example", daysAgo: 12 }),
    m({ id: "m-deccan", name: "Deccan Pack Solutions", type: "supplier", city: "Pune", state: "Maharashtra", contactRole: "Owner", phone: "9822012345", email: "sales@deccanpack.example", daysAgo: 16,
      visit: { date: day(-3), done: true, score: 4, notes: "Clean unit, 3 blow-moulding machines, ready stock of PET bottles.", checks: { "Licences match the documents": true, "Machines are as described": true, "Stock on hand": true, "Storage is clean and dry": true } } }),
    m({ id: "m-ayur", name: "Ayurvedic Herbals Pvt Ltd", type: "maker", city: "Ahmedabad", state: "Gujarat", contactRole: "Director", phone: "9824012345", email: "director@ayurherbals.example", daysAgo: 60,
      visit: { date: day(-45), done: true, score: 5, notes: "WHO-GMP unit, in-house lab.", checks: { "Licences on the wall match the documents": true, "Machines are as described": true, "Floor is clean and hygienic": true, "Quality lab on site": true, "Capacity looks right": true } }, liveAt: at(40) }),
  ];

  let n = 0;
  const doc = (memberId: string, kind: string, daysAgo: number, status: Doc["status"] = "Received", extra: Partial<Doc> = {}): Doc => ({
    id: `d${++n}`, memberId, kind, status, at: at(daysAgo), size: 180_000 + n * 23_000, name: `${kind.toLowerCase().replace(/[^a-z]+/g, "-")}.pdf`, ...extra,
  });
  const all = (memberId: string, kinds: string[], daysAgo: number, extra: Record<string, Partial<Doc>> = {}) => kinds.map((k, i) => doc(memberId, k, daysAgo - i * 0.2, "Approved", extra[k]));

  const docs: Doc[] = [
    doc("m-vardhman", "GST certificate", 5),
    doc("m-greenroot", "GST certificate", 6, "Approved"), doc("m-greenroot", "PAN card", 6, "Approved"),
    doc("m-greenroot", "Trademark certificate", 5, "Rejected", { reason: "Scan is unreadable" }),
    doc("m-balaji", "GST certificate", 7, "Approved"), doc("m-balaji", "FSSAI licence", 7, "Approved", { validTill: day(400) }), doc("m-balaji", "PAN card", 4),
    ...all("m-nilgiri", ["GST certificate", "FSSAI licence", "PAN card", "Cancelled cheque", "Signed agreement"], 8, { "FSSAI licence": { validTill: day(700) } }),
    ...all("m-deccan", ["GST certificate", "PAN card", "Product catalogue", "Cancelled cheque", "Signed agreement"], 12),
    ...all("m-ayur", ["GST certificate", "FSSAI licence", "GMP certificate", "PAN card", "Cancelled cheque", "Signed agreement"], 55, { "FSSAI licence": { validTill: day(21) }, "GMP certificate": { validTill: day(300) } }),
  ];

  let p = 0;
  const photo = (memberId: string, kind: string, thumb: string, daysAgo: number): Photo => ({ id: `p${++p}`, memberId, kind, thumb, at: at(daysAgo), name: thumb.split("/").pop()! });
  const photos: Photo[] = [
    // Unbranded photos only: these companies are invented.
    photo("m-deccan", "Production floor", "/console/upd-line.jpg", 3),
    photo("m-deccan", "Sample products", "/console/pkg-bottle120.jpg", 3),
    photo("m-deccan", "Stock room", "/console/pkg-pouch.jpg", 3),
    photo("m-ayur", "Quality lab", "/console/ev-1.jpg", 45),
    photo("m-ayur", "Production line", "/console/ev-2.jpg", 45),
    photo("m-ayur", "Packing area", "/console/ev-3.jpg", 45),
  ];

  const send = (id: string, memberId: string, pack: string, daysAgo: number, channel: "WhatsApp" | "Email" = "WhatsApp") => ({ id, memberId, pack, channel, at: at(daysAgo) });

  return {
    v: HQ_VERSION,
    members,
    docs,
    photos,
    inbox: [
      { id: "i1", name: "WhatsApp Image 2026-10-26 at 18.42.jpeg", size: 412_000, type: "image/jpeg", at: at(0.3), fileKey: "", thumb: "/console/ev-4.jpg", memberId: "m-balaji", kind: "Quality lab" },
      { id: "i2", name: "GreenRoot agreement signed.pdf", size: 238_000, type: "application/pdf", at: at(0.1), fileKey: "", memberId: "m-greenroot", kind: "Signed agreement" },
    ],
    sends: [
      send("s1", "m-vardhman", "Welcome kit", 5.5), send("s2", "m-vardhman", "Onboarding checklist", 5.5, "Email"),
      send("s3", "m-greenroot", "Welcome kit", 7), send("s4", "m-greenroot", "Missing documents reminder", 4),
      send("s5", "m-balaji", "Welcome kit", 8), send("s6", "m-balaji", "Onboarding checklist", 8, "Email"), send("s7", "m-balaji", "Missing documents reminder", 1),
      send("s8", "m-nilgiri", "Welcome kit", 11), send("s9", "m-nilgiri", "Agreement to sign", 10, "Email"),
      send("s10", "m-deccan", "Welcome kit", 15), send("s11", "m-deccan", "Agreement to sign", 14, "Email"),
      send("s12", "m-ayur", "Welcome kit", 59), send("s13", "m-ayur", "Login details", 40, "Email"),
    ],
    tasks: [
      { id: "t1", text: "Call Sri Balaji about the GMP certificate", memberId: "m-balaji", done: false, at: at(1) },
      { id: "t2", text: "Confirm Nilgiri Fresh's warehouse address for the visit", memberId: "m-nilgiri", done: false, at: at(1) },
      { id: "t3", text: "Send Ayurvedic Herbals their first leads", memberId: "m-ayur", done: true, at: at(30) },
    ],
    activity: [
      { id: "a1", at: at(0.1), text: "Signed agreement dropped in the Inbox" },
      { id: "a2", at: at(0.2), text: "Coastal Health Distributors signed up", memberId: "m-coastal" },
      { id: "a3", at: at(3), text: "Visit done at Deccan Pack Solutions · 4/5", memberId: "m-deccan" },
      { id: "a4", at: at(4), text: "PAN card received from Sri Balaji Nutraceuticals", memberId: "m-balaji" },
      { id: "a5", at: at(5), text: "Trademark certificate from GreenRoot rejected: scan is unreadable", memberId: "m-greenroot" },
      { id: "a6", at: at(5), text: "GST certificate received from Vardhman Labels", memberId: "m-vardhman" },
    ],
  };
}
