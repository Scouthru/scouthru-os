import type { ChatMessage, Doc, Enquiry, HqState, Invoice, Member, Photo, Teammate, Txn } from "./types";

export const HQ_VERSION = 5;

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
    m({ id: "m-coastal", name: "Coastal Health Distributors", type: "distributor", city: "Kochi", state: "Kerala", contactRole: "Operations head", phone: "9847012345", email: "ops@coastalhealth.example", daysAgo: 0.2, ownerId: "t-onb" }),
    m({ id: "m-vardhman", name: "Vardhman Labels", type: "supplier", city: "Ludhiana", state: "Punjab", contactRole: "Owner", phone: "9814012345", email: "info@vardhmanlabels.example", daysAgo: 6, ownerId: "t-onb" }),
    m({ id: "m-greenroot", name: "GreenRoot Foods", type: "brand", city: "Bengaluru", state: "Karnataka", contactRole: "Founder", phone: "9886012345", email: "hello@greenroot.example", daysAgo: 8, ownerId: "t-onb" }),
    m({ id: "m-balaji", name: "Sri Balaji Nutraceuticals", type: "maker", city: "Hyderabad", state: "Telangana", contactRole: "Plant head", phone: "9848012345", email: "plant@sribalaji.example", daysAgo: 9, ownerId: "t-onb", fieldId: "t-field",
      visit: { date: day(2), done: false, checks: {}, notes: "" }, notes: [{ at: at(8), text: "Capsule and tablet lines. Wants large-lot leads." }] }),
    m({ id: "m-nilgiri", name: "Nilgiri Fresh Distributors", type: "distributor", city: "Coimbatore", state: "Tamil Nadu", contactRole: "Partner", phone: "9843012345", email: "partner@nilgirifresh.example", daysAgo: 12, ownerId: "t-onb", fieldId: "t-field" }),
    m({ id: "m-deccan", name: "Deccan Pack Solutions", type: "supplier", city: "Pune", state: "Maharashtra", contactRole: "Owner", phone: "9822012345", email: "sales@deccanpack.example", daysAgo: 16, ownerId: "t-onb", fieldId: "t-field",
      visit: { date: day(-3), done: true, score: 4, notes: "Clean unit, 3 blow-moulding machines, ready stock of PET bottles.", checks: { "Licences match the documents": true, "Machines are as described": true, "Stock on hand": true, "Storage is clean and dry": true } } }),
    m({ id: "m-ayur", name: "Ayurvedic Herbals Pvt Ltd", type: "maker", city: "Ahmedabad", state: "Gujarat", contactRole: "Director", phone: "9824012345", email: "director@ayurherbals.example", daysAgo: 60, ownerId: "t-onb", fieldId: "t-field",
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
      { id: "t1", text: "Call Sri Balaji about the GMP certificate", memberId: "m-balaji", done: false, at: at(1), assigneeId: "t-onb" },
      { id: "t2", text: "Confirm Nilgiri Fresh's warehouse address for the visit", memberId: "m-nilgiri", done: false, at: at(1), assigneeId: "t-field" },
      { id: "t3", text: "Send Ayurvedic Herbals their first leads", memberId: "m-ayur", done: true, at: at(30), assigneeId: "t-sales" },
      { id: "t4", text: "Chase Ayurvedic Herbals for the overdue invoice", done: false, at: at(0.5), assigneeId: "t-acc" },
      { id: "t5", text: "Quote FitFuel for the whey pouches", done: false, at: at(0.3), assigneeId: "t-sales" },
    ],
    activity: [
      { id: "a1", at: at(0.1), text: "Signed agreement dropped in the Inbox" },
      { id: "a2", at: at(0.2), text: "Coastal Health Distributors signed up", memberId: "m-coastal" },
      { id: "a3", at: at(3), text: "Visit done at Deccan Pack Solutions · 4/5", memberId: "m-deccan" },
      { id: "a4", at: at(4), text: "PAN card received from Sri Balaji Nutraceuticals", memberId: "m-balaji" },
      { id: "a5", at: at(5), text: "Trademark certificate from GreenRoot rejected: scan is unreadable", memberId: "m-greenroot" },
      { id: "a6", at: at(5), text: "GST certificate received from Vardhman Labels", memberId: "m-vardhman" },
    ],
    owner: "Kartheek",
    enquiries: enquiries(at),
    events: [
      { id: "e1", date: day(1), title: "Call GreenRoot about the signed agreement", memberId: "m-greenroot" },
      { id: "e2", date: day(6), title: "Review meeting with Sri Balaji on large-lot leads", memberId: "m-balaji" },
      { id: "e3", date: day(9), title: "Trade fair: Ingredients India, Mumbai" },
    ],
    txns: txns(now),
    invoices: invoices(day),
    goals: [
      { id: "g-office", name: "Office", target: 100_000, saved: 78_000 },
      { id: "g-fleet", name: "Fleet", target: 120_000, saved: 60_000 },
      { id: "g-hire", name: "New hire", target: 150_000, saved: 30_000 },
    ],
    team: TEAM,
    chat: chat(at),
    // Everyone has read up to an hour ago, so the latest messages show as new.
    reads: Object.fromEntries(TEAM.map((t) => [t.id, Object.fromEntries(["general", "onboarding", "field", "sales", "finance"].map((c) => [c, at(1 / 24)]))])),
  };
}

/** Seats named by role; the owner renames each to the real person on the Team page. */
const TEAM: Teammate[] = [
  { id: "t-owner", name: "Kartheek", role: "owner", active: true },
  { id: "t-onb", name: "Onboarding desk", role: "onboarding", active: true },
  { id: "t-field", name: "Field team", role: "field", active: true },
  { id: "t-sales", name: "Sales desk", role: "sales", active: true },
  { id: "t-acc", name: "Accounts desk", role: "accounts", active: true },
];

function chat(at: (days: number) => string): ChatMessage[] {
  let n = 0;
  const m = (daysAgo: number, from: string, to: string, text: string, ref?: ChatMessage["ref"]): ChatMessage => ({ id: `cm${++n}`, at: at(daysAgo), from, to, text, ref });
  return [
    m(2, "t-owner", "general", "Morning all. Priority this week: get Deccan Pack and Sri Balaji live, and clear the overdue invoices."),
    m(1.9, "t-sales", "general", "On it. Two big supplement enquiries came in over the weekend."),
    m(3, "hq", "field", "Deccan Pack Solutions has all documents approved. Ready for a visit in Pune. @Field team", { kind: "member", id: "m-deccan" }),
    m(2.8, "t-field", "field", "Visit at Deccan done. Clean unit, 3 blow-moulding machines. Gave it 4/5, photos are up.", { kind: "member", id: "m-deccan" }),
    m(2.7, "hq", "onboarding", "Deccan Pack Solutions is ready for approval: documents, visit (4/5) all done. @Kartheek", { kind: "member", id: "m-deccan" }),
    m(1.2, "t-onb", "onboarding", "Sri Balaji sent their PAN card. Still waiting on GMP, cheque and the signed agreement. Chasing today.", { kind: "member", id: "m-balaji" }),
    m(0.6, "t-onb", "m:m-greenroot", "Their trademark scan was unreadable. Asked for a clearer copy on WhatsApp."),
    m(0.5, "t-owner", "m:m-greenroot", "Thanks. If it doesn't come by Friday, call the founder directly."),
    m(0.4, "hq", "sales", "New WhatsApp enquiry: Whey protein, 1 kg pouch, 8,000 units for FitFuel Brands. Who's picking it up?", { kind: "enquiry", id: "q2" }),
    m(0.3, "t-sales", "sales", "I'll take the whey one. @Accounts desk can you check if FitFuel owes us anything from last time?", { kind: "enquiry", id: "q2" }),
    m(0.2, "t-acc", "finance", "Ayurvedic Herbals is 9 days late on ₹1,12,000. I'll send a reminder; @Kartheek may need to call."),
    m(0.1, "t-owner", "dm:t-acc:t-owner", "I'll call Ayurvedic Herbals this afternoon."),
  ];
}

function enquiries(at: (days: number) => string): Enquiry[] {
  const e = (id: string, product: string, category: string, buyer: string, qty: number, channel: Enquiry["channel"], status: Enquiry["status"], daysAgo: number, factoryId?: string, value?: number): Enquiry =>
    ({ id, product, category, buyer, qty, channel, status, at: at(daysAgo), factoryId, value, assigneeId: status === "New" ? undefined : "t-sales" });
  return [
    e("q1", "Ashwagandha capsules", "Supplements", "GreenRoot Foods", 50_000, "Marketplace", "New", 0.1),
    e("q2", "Whey protein, 1 kg pouch", "Food & beverages", "FitFuel Brands", 8_000, "WhatsApp", "New", 0.4),
    e("q3", "Vitamin C tablets", "Supplements", "Medlife Retail", 100_000, "Marketplace", "Matched", 1, "m-balaji", 420_000),
    e("q4", "PET bottles 150 ml", "Packaging", "Sri Balaji Nutraceuticals", 60_000, "Phone", "Quoted", 2, "m-deccan", 186_000),
    e("q5", "Herbal hair oil", "Personal care", "Kerala Naturals", 20_000, "IndiaMART", "Quoted", 3, "m-ayur", 640_000),
    e("q6", "Multivitamin gummies", "Supplements", "Happy Bites Co", 40_000, "Marketplace", "Won", 6, "m-ayur", 1_120_000),
    e("q7", "Millet protein bars", "Food & beverages", "Snackwise", 30_000, "Walk-in", "Lost", 9),
    e("q8", "Retinol face cream", "Skincare", "Glow Lab", 15_000, "Marketplace", "Matched", 2, "m-ayur", 525_000),
  ];
}

/** Six months of money in and out, for both marketplace and regular business. Fuel creeps up; one software bill is paid twice. */
function txns(now: number): Txn[] {
  const out: Txn[] = [];
  const t = new Date(now);
  let n = 0;
  for (let back = 5; back >= 0; back--) {
    const m = new Date(t.getFullYear(), t.getMonth() - back, 1);
    // yyyy-mm-dd built by hand: toISOString() would shift local midnight into the previous day.
    const d = (day: number) => `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, back === 0 ? Math.max(1, t.getDate()) : 28)).padStart(2, "0")}`;
    const add = (day: number, kind: Txn["kind"], category: string, party: string, amount: number, channel?: Txn["channel"]) =>
      out.push({ id: `x${++n}`, date: d(day), kind, category, party, amount, channel });
    const k = 5 - back; // 0 oldest … 5 this month
    add(5, "in", "Marketplace commission", "Order commissions", 420_000 + k * 38_000, "Marketplace");
    add(8, "in", "Pro subscriptions", "Factory plans", 54_000 + k * 6_000, "Marketplace");
    add(12, "in", "Regular orders", "Direct and WhatsApp orders", 260_000 + (k % 3) * 40_000, "Regular");
    add(1, "out", "Salaries", "Team", 240_000);
    add(2, "out", "Office rent", "Landlord", 55_000);
    add(10, "out", "Fleet and fuel", "Fuel and van hire", 38_000 + k * 9_500);
    add(14, "out", "Travel for visits", "Factory visits", 22_000 + (k % 2) * 6_000);
    add(16, "out", "Marketing", "Ads and trade fairs", 45_000);
    add(18, "out", "Software", "Tools and hosting", 14_500);
    if (back === 1) add(19, "out", "Software", "Tools and hosting", 14_500);
  }
  return out;
}

function invoices(day: (offset: number) => string): Invoice[] {
  return [
    { id: "v1", no: "SH-INV-2141", party: "Ayurvedic Herbals Pvt Ltd", direction: "receive", amount: 112_000, due: day(-9), channel: "Marketplace" },
    { id: "v2", no: "SH-INV-2152", party: "Happy Bites Co", direction: "receive", amount: 56_000, due: day(4), channel: "Marketplace" },
    { id: "v3", no: "SH-INV-2156", party: "Kerala Naturals", direction: "receive", amount: 84_000, due: day(-2), channel: "Regular" },
    { id: "v4", no: "SH-INV-2160", party: "Deccan Pack Solutions", direction: "receive", amount: 4_999, due: day(6), channel: "Marketplace" },
    { id: "v5", no: "RENT-NOV", party: "Landlord", direction: "pay", amount: 55_000, due: day(3) },
    { id: "v6", no: "FUEL-0931", party: "Fuel and van hire", direction: "pay", amount: 61_000, due: day(-1) },
  ];
}
