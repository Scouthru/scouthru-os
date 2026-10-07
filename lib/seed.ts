import type { Action, Case, Enquiry, Lead, Order, OrderStage, PO, Product, Quote, RetailerOrder, State, StockItem, Unit, UnitProfile } from "./types";
import { sha256 } from "./sha256";

/**
 * Demo network. Every company, unit and figure here is invented for the demo;
 * factory names stay hidden behind unit codes on the marketplace, as in the
 * designs, until a buyer connects.
 */

const DAY = 86400000;
export const dayLabel = (offset: number) =>
  new Date(Date.now() + offset * DAY).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const h = (s: string) => sha256(s);

// ---------------------------------------------------------------------------
// marketplace
// ---------------------------------------------------------------------------

const tiers = (p: number, moq: number, lead: string) => [
  { range: `${moq.toLocaleString("en-IN")} to ${(moq * 5 - 1).toLocaleString("en-IN")}`, min: moq, price: p, lead },
  { range: `${(moq * 5).toLocaleString("en-IN")} to ${(moq * 20 - 1).toLocaleString("en-IN")}`, min: moq * 5, price: Math.round(p * 0.875 * 100) / 100, lead },
  { range: `${(moq * 20).toLocaleString("en-IN")}+`, min: moq * 20, price: Math.round(p * 0.78 * 100) / 100, lead: lead.replace(/\d+/, (n) => String(+n + 1)) },
];

export const PRODUCTS: Product[] = [
  {
    id: "whey-protein-bar", name: "Whey protein bar, 20g protein", category: "snacks", categoryLabel: "Healthy snacks", format: "Bars", pack: "BAR", tint: "oat",
    tiers: tiers(32, 1000, "3 weeks"), moq: 1000, lead: "3 weeks", unit: "HYD-0142",
    desc: "A ready formula you can launch under your own brand. Change flavour, coating and pack. Sample and demo prices shown.",
    options: [{ label: "Flavour", values: ["Chocolate", "Peanut butter", "Coffee", "Custom"] }, { label: "Bar size", values: ["50 g", "60 g", "70 g"] }, { label: "Pack", values: ["Single wrapper", "Box of 6", "Box of 12"] }],
    specs: [["Protein", "20 g per bar"], ["Shelf life", "6 months"], ["Format", "Coated bar, flow wrap"], ["Licence", "FSSAI"], ["Dispatch from", "Hyderabad"]],
    included: ["Ready formula, tweakable", "Wrapper design support", "Label compliance check", "NABL lab test report", "QC against approved sample"],
  },
  {
    id: "plant-protein", name: "Plant protein powder", category: "supplements", categoryLabel: "Supplements", format: "Powders", pack: "POUCH", tint: "sage",
    tiers: tiers(410, 500, "4 weeks"), moq: 500, lead: "4 weeks", unit: "PUN-0087",
    desc: "Pea and brown-rice protein blend, 24 g per scoop. Unflavoured or one of six flavour bases.",
    options: [{ label: "Flavour", values: ["Unflavoured", "Chocolate", "Vanilla", "Custom"] }, { label: "Pack size", values: ["500 g", "1 kg", "2 kg"] }, { label: "Pack", values: ["Zip pouch", "HDPE jar"] }],
    specs: [["Protein", "24 g per 30 g scoop"], ["Shelf life", "18 months"], ["Format", "Powder"], ["Licence", "FSSAI, ISO 22000"], ["Dispatch from", "Pune"]],
    included: ["Ready formula", "Label claims review", "COA per batch", "QC against approved sample"],
  },
  {
    id: "vitamin-c-serum", name: "Vitamin C face serum, 30ml", category: "skincare", categoryLabel: "Skincare", format: "Serums", pack: "BOTTLE", tint: "blush",
    tiers: tiers(68, 1000, "3 weeks"), moq: 1000, lead: "3 weeks", unit: "BLR-0210",
    desc: "10% ethyl ascorbic acid with ferulic acid in an amber dropper bottle. Stability-tested base.",
    options: [{ label: "Strength", values: ["10%", "15%", "20%"] }, { label: "Bottle", values: ["Amber dropper", "Airless pump"] }, { label: "Pack", values: ["Bottle only", "Bottle + carton"] }],
    specs: [["Active", "10% ethyl ascorbic acid"], ["Shelf life", "24 months"], ["Format", "Serum, 30 ml"], ["Licence", "Cosmetic manufacturing licence"], ["Dispatch from", "Bengaluru"]],
    included: ["Stability-tested formula", "Ingredient list and claims check", "Patch test report", "QC against approved sample"],
  },
  {
    id: "spf50-gel", name: "SPF 50 sunscreen gel", category: "skincare", categoryLabel: "Skincare", format: "Creams", pack: "TUBE", tint: "blush",
    tiers: tiers(74, 2000, "4 weeks"), moq: 2000, lead: "4 weeks", unit: "BLR-0210",
    desc: "Lightweight gel sunscreen, no white cast. SPF and PA++++ tested in a third-party lab.",
    options: [{ label: "Size", values: ["50 g", "80 g"] }, { label: "Finish", values: ["Matte", "Dewy"] }, { label: "Pack", values: ["Tube", "Tube + carton"] }],
    specs: [["SPF", "50, PA++++"], ["Shelf life", "24 months"], ["Format", "Gel, tube"], ["Licence", "Cosmetic manufacturing licence"], ["Dispatch from", "Bengaluru"]],
    included: ["Tested formula", "SPF test report", "Artwork check", "QC against approved sample"],
  },
  {
    id: "biotin-gummies", name: "Biotin gummies", category: "supplements", categoryLabel: "Supplements", format: "Gummies", pack: "JAR", tint: "sage",
    tiers: tiers(95, 1000, "5 weeks"), moq: 1000, lead: "5 weeks", unit: "HYD-0311",
    desc: "Pectin-based, gelatin-free gummies, 30 per jar. Sugar-reduced option available.",
    options: [{ label: "Flavour", values: ["Mixed berry", "Orange", "Custom"] }, { label: "Count", values: ["30", "60"] }, { label: "Base", values: ["Regular", "Sugar-reduced"] }],
    specs: [["Biotin", "5,000 mcg per serving"], ["Shelf life", "18 months"], ["Format", "Pectin gummy"], ["Licence", "WHO-GMP"], ["Dispatch from", "Hyderabad"]],
    included: ["Ready formula", "Claims review", "COA per batch", "QC against approved sample"],
  },
  {
    id: "millet-chips", name: "Roasted millet chips", category: "snacks", categoryLabel: "Healthy snacks", format: "Chips", pack: "POUCH", tint: "oat",
    tiers: tiers(18, 5000, "2 weeks"), moq: 5000, lead: "2 weeks", unit: "HYD-0142", starter: false,
    desc: "Ragi and jowar chips, roasted not fried, palm-oil free. 60 g nitrogen-flushed pouch.",
    options: [{ label: "Flavour", values: ["Peri peri", "Cream & onion", "Classic salted", "Custom"] }, { label: "Pack size", values: ["30 g", "60 g", "100 g"] }, { label: "Pack", values: ["Single pouch", "Box of 12"] }],
    specs: [["Base", "Ragi, jowar"], ["Shelf life", "5 months"], ["Format", "Roasted chips"], ["Licence", "FSSAI"], ["Dispatch from", "Hyderabad"]],
    included: ["Ready recipe", "Pouch design support", "Nutrition panel", "QC against approved sample"],
  },
  {
    id: "electrolyte-mix", name: "Electrolyte drink mix", category: "beverages", categoryLabel: "Beverages", format: "Drink mixes", pack: "SACHET", tint: "sky",
    tiers: tiers(9, 10000, "3 weeks"), moq: 10000, lead: "3 weeks", unit: "PUN-0087",
    desc: "Sugar-free electrolyte powder, 10 g sachet. Sodium, potassium and magnesium per WHO ORS ratios.",
    options: [{ label: "Flavour", values: ["Lemon", "Orange", "Watermelon", "Custom"] }, { label: "Sachet", values: ["10 g", "20 g"] }],
    specs: [["Per sachet", "Na 300 mg, K 150 mg"], ["Shelf life", "18 months"], ["Format", "Powder sachet"], ["Licence", "FSSAI, ISO 22000"], ["Dispatch from", "Pune"]],
    included: ["Ready formula", "Sachet artwork support", "COA per batch", "QC against approved sample"],
  },
  {
    id: "ashwagandha", name: "Ashwagandha capsules", category: "supplements", categoryLabel: "Supplements", format: "Capsules", pack: "BOTTLE", tint: "sage",
    tiers: tiers(88, 1000, "4 weeks"), moq: 1000, lead: "4 weeks", unit: "HYD-0311", starter: true,
    desc: "KSM-66 style root extract, 600 mg, 60 veg capsules per bottle.",
    options: [{ label: "Strength", values: ["300 mg", "600 mg"] }, { label: "Count", values: ["60", "90"] }],
    specs: [["Extract", "600 mg root extract"], ["Shelf life", "24 months"], ["Format", "Veg capsule"], ["Licence", "WHO-GMP"], ["Dispatch from", "Hyderabad"]],
    included: ["Ready formula", "AYUSH label check", "COA per batch", "QC against approved sample"],
  },
  {
    id: "makhana", name: "Roasted makhana, peri peri", category: "snacks", categoryLabel: "Healthy snacks", format: "Chips", pack: "POUCH", tint: "oat",
    tiers: tiers(24, 2000, "2 weeks"), moq: 2000, lead: "2 weeks", unit: "HYD-0142", starter: true,
    desc: "Bihar makhana roasted in rice bran oil, 50 g pouch.", options: [{ label: "Flavour", values: ["Peri peri", "Himalayan salt", "Pudina"] }],
    specs: [["Base", "Fox nut"], ["Shelf life", "6 months"], ["Licence", "FSSAI"], ["Dispatch from", "Hyderabad"]], included: ["Ready recipe", "QC against approved sample"],
  },
  {
    id: "onion-hair-oil", name: "Onion hair oil, 200ml", category: "personal", categoryLabel: "Personal care", format: "Oils", pack: "BOTTLE", tint: "lilac",
    tiers: tiers(46, 1000, "3 weeks"), moq: 1000, lead: "3 weeks", unit: "BLR-0210", starter: true,
    desc: "Red onion and bhringraj in a cold-pressed base.", options: [{ label: "Size", values: ["100 ml", "200 ml"] }],
    specs: [["Base", "Coconut, sesame"], ["Shelf life", "24 months"], ["Licence", "Cosmetic licence"], ["Dispatch from", "Bengaluru"]], included: ["Ready formula", "QC against approved sample"],
  },
  {
    id: "pet-jar", name: "PET jar 200g with cap", category: "packaging", categoryLabel: "Packaging", format: "Bottles", pack: "JAR", tint: "stone",
    tiers: tiers(6.5, 2000, "1 week"), moq: 2000, lead: "1 week", unit: "HYD-0398", starter: true,
    desc: "Clear PET jar, 63 mm neck, food grade, with PP cap.", options: [{ label: "Cap", values: ["White", "Black", "Gold"] }],
    specs: [["Material", "Food-grade PET"], ["Neck", "63 mm"], ["Licence", "BIS food contact"], ["Dispatch from", "Hyderabad"]], included: ["Food-contact certificate", "Sample before order"],
  },
];

export const UNITS: Unit[] = [
  { code: "HYD-0142", city: "Hyderabad", state: "Telangana", licences: ["FSSAI", "GMP"], lines: "Bars, chips, makhana", category: ["Protein bars", "Healthy snacks"], formats: ["Bars"], booked: 75, moq: 5000, freeCap: 25000, lead: 21, tags: ["Whey bars", "Plant protein", "Private label", "Small batches"], kind: "Bars and snack manufacturing", name: "Nutrabite Foods" },
  { code: "HYD-0311", city: "Hyderabad", state: "Telangana", licences: ["WHO-GMP"], lines: "Capsules, tablets, gummies", category: ["Supplements"], formats: ["Capsules", "Gummies"], booked: 52, moq: 1000, freeCap: 180000, lead: 30, tags: ["Gummies", "Capsules", "Ayurvedic"], kind: "Nutraceutical manufacturing", name: "Genome Health Labs" },
  { code: "BLR-0210", city: "Bengaluru", state: "Karnataka", licences: ["Cosmetic licence", "FSSAI"], lines: "Serums, creams, sunscreens", category: ["Skincare", "Protein bars"], formats: ["Bars"], booked: 40, moq: 1000, freeCap: 60000, lead: 24, tags: ["Millet bars", "Sugar-free", "Export ready"], kind: "Health foods and skincare", name: "Bloom Formulations" },
  { code: "PUN-0087", city: "Pune", state: "Maharashtra", licences: ["FSSAI", "ISO 22000"], lines: "Powders, drink mixes", category: ["Protein bars", "Supplements"], formats: ["Bars", "Powders"], booked: 88, moq: 3000, freeCap: 12000, lead: 28, tags: ["Protein bars", "Granola", "Custom formulas"], kind: "Nutrition and snacks", name: "Sahyadri Nutrition" },
  { code: "GNT-0057", city: "Guntur", state: "Andhra Pradesh", licences: ["FSSAI", "ISO 22000"], lines: "Pickles, pastes, spice powders", category: ["Healthy snacks"], formats: [], booked: 64, moq: 2000, freeCap: 40000, lead: 18, tags: ["Pickles", "Chilli powder", "Glass jars"], kind: "Pickles and spices", name: "Sri Lakshmi Foods" },
  { code: "HYD-0398", city: "Hyderabad", state: "Telangana", licences: ["ISO 9001"], lines: "PET jars and bottles", category: ["Packaging"], formats: [], booked: 58, moq: 2000, freeCap: 800000, lead: 7, tags: ["PET", "Caps", "Custom moulds"], kind: "Rigid packaging", name: "Telangana PET Containers" },
];

const PROFILES: Record<string, UnitProfile> = {
  "HYD-0142": { areaSqft: 18000, founded: 2014, employees: 85, about: "Contract manufacturer of protein bars, roasted chips and makhana for D2C brands. Two bar lines, one roasting line, nitrogen-flush packing.", facilities: ["2 cold-forming bar lines", "Rotary roaster", "N2-flush pouch packing", "In-house QC lab"], allergens: ["Peanut", "Milk", "Soy", "Gluten"], dietary: ["Vegan", "Jain", "Sugar-free"], digital: ["Batch traceability", "Online order tracking", "Tally-linked invoicing"], customers: ["3 D2C snack brands", "1 regional supermarket chain"], projects: [{ title: "Whey protein bars, 4 flavours", year: 2026, units: 120000 }, { title: "Ragi chips for a kids brand", year: 2025, units: 90000 }], contacts: [{ role: "Owner", vetted: true }, { role: "Plant manager", vetted: true }] },
  "HYD-0311": { areaSqft: 26000, founded: 2012, employees: 140, about: "WHO-GMP nutraceutical plant: capsules, tablets and pectin gummies for wellness brands.", facilities: ["Gummy depositor", "Capsule filler x2", "Blister packing", "Stability chamber"], allergens: ["Soy"], dietary: ["Vegan", "Gelatin-free"], digital: ["COA per batch", "Batch traceability"], customers: ["5 wellness brands", "2 pharmacy chains"], projects: [{ title: "Biotin gummies relaunch", year: 2026, units: 60000 }], contacts: [{ role: "BD head", vetted: true }] },
  "BLR-0210": { areaSqft: 15000, founded: 2016, employees: 60, about: "Clean-label skincare and health foods. In-house formulation chemist and stability testing.", facilities: ["Tube and bottle filling", "Stability chamber", "R&D lab"], allergens: ["Tree nuts"], dietary: ["Vegan"], digital: ["Formulation dossier per SKU"], customers: ["4 skincare D2C brands"], projects: [{ title: "Vitamin C serum, 3 strengths", year: 2026, units: 40000 }], contacts: [{ role: "Formulation head", vetted: true }] },
  "PUN-0087": { areaSqft: 30000, founded: 2010, employees: 110, about: "Powders, drink mixes and granola. Sachet and pouch lines with ISO 22000.", facilities: ["Ribbon blender", "Sachet line x3", "Pouch filler"], allergens: ["Milk", "Soy"], dietary: ["Sugar-free", "Keto"], digital: ["ERP-linked dispatch"], customers: ["2 sports nutrition brands"], projects: [{ title: "Electrolyte mix, 3 flavours", year: 2025, units: 400000 }], contacts: [{ role: "GM operations", vetted: true }] },
  "GNT-0057": { areaSqft: 22000, founded: 2009, employees: 120, about: "Andhra pickles, pastes and spice powders in glass jars and pouches. Export-grade line with metal detection.", facilities: ["Jar filling line", "Cryo spice grinder", "Metal detector"], allergens: ["Mustard", "Sesame"], dietary: ["Vegan", "Jain"], digital: ["Batch traceability"], customers: ["Ruchika Foods", "2 export houses"], projects: [{ title: "Mango pickle, 3 sizes", year: 2026, units: 30000 }], contacts: [{ role: "Director", vetted: true }] },
  "HYD-0398": { areaSqft: 20000, founded: 2008, employees: 75, about: "PET jars and bottles from 50 ml to 2 L plus PP caps, with an in-house mould shop.", facilities: ["ISBM machines x6", "Mould shop"], allergens: [], dietary: [], digital: ["Online dispatch tracking"], customers: ["Pickle and spice brands"], projects: [{ title: "200 g jar for a pickle brand", year: 2026, units: 200000 }], contacts: [{ role: "Director", vetted: true }] },
};
UNITS.forEach((u) => {
  u.profile = PROFILES[u.code];
  u.status = "verified";
});

export const PACKAGING_SUPPLY: [string, string][] = [["PET bottles and jars", "MOQ 2,000"], ["Stand-up pouches, printed", "MOQ 3,000"], ["Labels and cartons", "MOQ 1,000"], ["Airless pumps and tubes", "MOQ 2,000"]];
export const INGREDIENT_SUPPLY: [string, string][] = [["Whey protein concentrate", "From 25 kg"], ["Ashwagandha extract", "From 5 kg"], ["Niacinamide", "From 1 kg"], ["Millet flours", "From 100 kg"]];
/** Products brands have launched through Scouthru. Sample showcase for the demo. */
export const MADE_WITH: { photo: string; name: string; brand: string; category: string; pack: string; tint: "sage" | "blush" | "oat" | "sky" | "lilac" | "stone"; unit: string; city: string; units: number; weeks: number; similar: string }[] = [
  { photo: "/products/made-peanut-bar.jpg", name: "Peanut butter protein bar", brand: "FitFuel", category: "Healthy snacks", pack: "BAR", tint: "oat", unit: "HYD-0142", city: "Hyderabad", units: 12000, weeks: 5, similar: "whey-protein-bar" },
  { photo: "/products/made-turmeric.jpg", name: "Turmeric powder 500g", brand: "Ruchika Foods", category: "Spices", pack: "POUCH", tint: "oat", unit: "NZB-0120", city: "Nizamabad", units: 4000, weeks: 4, similar: "" },
  { photo: "/products/made-gongura.jpg", name: "Gongura pickle 300g", brand: "Ruchika Foods", category: "Pickles", pack: "JAR", tint: "blush", unit: "VJA-0233", city: "Vijayawada", units: 2000, weeks: 6, similar: "" },
  { photo: "/products/made-serum.jpg", name: "Vitamin C face serum", brand: "Glowkind", category: "Skincare", pack: "BOTTLE", tint: "blush", unit: "BLR-0210", city: "Bengaluru", units: 5000, weeks: 7, similar: "vitamin-c-serum" },
];

export const CATEGORIES = [
  { id: "supplements", label: "Supplements", sub: "Capsules, gummies, powders", tint: "sage" },
  { id: "skincare", label: "Skincare", sub: "Serums, sunscreens, washes", tint: "blush" },
  { id: "snacks", label: "Healthy snacks", sub: "Bars, chips, makhana", tint: "oat" },
  { id: "beverages", label: "Beverages", sub: "Drink mixes, RTD", tint: "sky" },
  { id: "personal", label: "Personal care", sub: "Hair, body, grooming", tint: "lilac" },
  { id: "packaging", label: "Packaging", sub: "Bottles, pouches, labels", tint: "stone" },
] as const;

// subcategories shown on hover; each matches ready products by format or name
export const CATEGORY_SUBS: Record<string, { label: string; match: string[] }[]> = {
  supplements: [{ label: "Capsules", match: ["capsule"] }, { label: "Gummies", match: ["gumm"] }, { label: "Protein powders", match: ["powder"] }, { label: "Tablets", match: ["tablet"] }],
  skincare: [{ label: "Serums", match: ["serum"] }, { label: "Sunscreens", match: ["sunscreen", "spf"] }, { label: "Creams", match: ["cream"] }, { label: "Face washes", match: ["face wash"] }],
  snacks: [{ label: "Protein bars", match: ["bar"] }, { label: "Chips", match: ["chips"] }, { label: "Makhana", match: ["makhana"] }],
  beverages: [{ label: "Drink mixes", match: ["drink mix"] }, { label: "Ready to drink", match: ["rtd", "ready to drink"] }, { label: "Energy drinks", match: ["energy"] }],
  personal: [{ label: "Hair oils", match: ["hair oil"] }, { label: "Shampoos", match: ["shampoo"] }, { label: "Body wash", match: ["body wash"] }],
  packaging: [{ label: "Jars & bottles", match: ["jar", "bottle"] }, { label: "Pouches", match: ["pouch"] }, { label: "Labels", match: ["label"] }],
};
export const inSub = (p: { name: string; format: string }, cat: string, sub: string) => {
  const m = CATEGORY_SUBS[cat]?.find((x) => x.label === sub)?.match ?? [];
  const hay = `${p.format} ${p.name}`.toLowerCase();
  return m.some((w) => hay.includes(w));
};

// ---------------------------------------------------------------------------
// orders (shared by the brand, factory, supplier and distributor views)
// ---------------------------------------------------------------------------

const PHASE_NAMES = ["Phase 1 · Raw material & packaging", "Phase 2 · Production", "Phase 3 · Packing, QC, dispatch"];

function order(o: Partial<Order> & Pick<Order, "id" | "product" | "qty" | "uom" | "factoryId" | "factory" | "factoryCity" | "stage" | "progress" | "health" | "next" | "due" | "unitPrice">): Order {
  const stageIdx: Record<OrderStage, number> = { enquiry: 0, agreed: 1, sample: 2, production: 3, qc: 4, dispatch: 5, delivered: 6, closed: 7 };
  const s = stageIdx[o.stage];
  const ph1 = s >= 3 ? "done" : s === 2 ? "active" : "todo";
  const ph2 = s >= 4 ? "done" : s === 3 ? "active" : "todo";
  const ph3 = s >= 6 ? "done" : s >= 4 ? "active" : "todo";
  return {
    brandId: "ruchika",
    deliverBy: dayLabel(22),
    frozenTill: dayLabel(9),
    phases: [
      { name: PHASE_NAMES[0], detail: "Raw material and packaging received", pct: ph1 === "done" ? 100 : ph1 === "active" ? 40 : 0, status: ph1, payPct: 30, pay: ph1 === "done" ? "paid" : "proof", payNote: ph1 === "done" ? `Paid ${dayLabel(-5)}` : "On verified proof" },
      { name: PHASE_NAMES[1], detail: "Production", pct: ph2 === "done" ? 100 : ph2 === "active" ? 58 : 0, status: ph2, payPct: 30, pay: ph2 === "done" ? "paid" : ph2 === "active" ? "proof" : "later", payNote: ph2 === "done" ? "Paid" : "Unlocks at 100%" },
      { name: PHASE_NAMES[2], detail: "QC agent booked", pct: ph3 === "done" ? 100 : ph3 === "active" ? 50 : 0, status: ph3, payPct: 20, pay: s >= 7 ? "paid" : "later", payNote: "After delivery" },
    ],
    payments: [
      { label: "Advance · 20%", pct: 20, status: s >= 1 ? "paid" : "later" },
      { label: "Phase 1 · 30%", pct: 30, status: s >= 3 ? "paid" : s === 2 ? "proof" : "later" },
      { label: "Phase 2 · 30%", pct: 30, status: s >= 4 ? "paid" : s === 3 ? "proof" : "later" },
      { label: "Final · 20%", pct: 20, status: s >= 7 ? "paid" : "later" },
    ],
    proofs: [],
    changes: [],
    split: { inhouse: o.qty, partner: 0 },
    chat: [],
    docs: [{ name: "Agreement (signed)", meta: `PDF · ${dayLabel(-10)}` }, { name: "Golden sample record", meta: "6 photos" }, { name: `FSSAI licence · ${o.factory}`, meta: "Valid" }, { name: "Invoices", meta: "2 files" }],
    ...o,
  };
}

const proof = (title: string, kind: string, detail: string, at: string, image?: string): Order["proofs"][number] => ({ id: h(title + at).slice(0, 8), kind, title, detail, at, hash: h(`${title}|${detail}|${at}`), verified: true, image });

export const ORDERS: Order[] = [
  order({
    id: "SO-1042", product: "Mango pickle 500g", qty: 3000, uom: "jars", factoryId: "GNT-0057", factory: "Sri Lakshmi Foods", factoryCity: "Guntur", stage: "production", progress: 58, health: "On track", next: "30% on Phase 2 proof", due: dayLabel(4), unitPrice: 92, deliverBy: dayLabel(23),
    phases: [
      { name: PHASE_NAMES[0], detail: "Mangoes, oil, spices received · 3,000 jars in stock", pct: 100, status: "done", payPct: 30, pay: "paid", payNote: `Paid ${dayLabel(-5)}` },
      { name: PHASE_NAMES[1], detail: "Batch 2 of 3 filling · 1,740 jars done", pct: 58, status: "active", payPct: 30, pay: "proof", payNote: "Unlocks at 100%" },
      { name: PHASE_NAMES[2], detail: `QC agent booked for ${dayLabel(11)}`, pct: 0, status: "todo", payPct: 20, pay: "later", payNote: "After delivery" },
    ],
    payments: [{ label: "Advance · 20%", pct: 20, status: "paid" }, { label: "Phase 1 · 30%", pct: 30, status: "paid" }, { label: "Phase 2 · 30%", pct: 30, status: "due" }, { label: "Final · 20%", pct: 20, status: "later" }],
    proofs: [
      proof("Batch 2 filling started", "Photo · filling line", "880 jars filled, sealed · operator log attached", "Today, 11:20", "/proofs/filling-line.jpg"),
      proof("Oil content test · Batch 1", "Photo · lab report", "Oil 16.4% (spec ≤ 18%)", "Yesterday", "/proofs/lab-test.jpg"),
      proof("Packaging received", "Photo · jar stock", "3,000 glass jars + sleeves · supplier invoice", dayLabel(-5), "/proofs/jar-stock.jpg"),
    ],
    changes: [{ id: "ch1", text: "Your request: label artwork v3 → v4", note: `Raised ${dayLabel(-3)} · factory approval needed · no price impact`, status: "Awaiting factory", by: "brand" }],
    split: { inhouse: 2250, partner: 750, partnerName: "GNT-0091 · vetted" },
    chat: [{ from: "factory", text: "Filling line started for batch 2, photos uploaded.", at: "Factory · 11:20" }, { from: "brand", text: "Thanks. Please share oil % test too.", at: "You · 11:42" }],
  }),
  order({
    id: "SO-1038", product: "Ginger paste 200g", qty: 5000, uom: "jars", factoryId: "HYD-0517", factory: "Deccan Agro Foods", factoryCity: "Hyderabad", stage: "production", progress: 41, health: "Delayed 3d", next: "Price change approval", due: dayLabel(2), unitPrice: 38,
    changes: [{ id: "ch2", text: "Price change: ₹38.00 → ₹39.20 per unit (+₹1.20)", note: "Reason: glass jar cost up 9% since quote · supplier invoice attached", status: "Awaiting you", by: "factory", priceDelta: 1.2 }],
    proofs: [proof("Ginger received and washed", "Photo · raw material", "1,100 kg fresh ginger · weighbridge slip", dayLabel(-8))],
  }),
  order({
    id: "SO-1031", product: "Gongura pickle 300g", qty: 2000, uom: "jars", factoryId: "VJA-0233", factory: "Krishna Pickles", factoryCity: "Vijayawada", stage: "qc", progress: 86, health: "Action", next: "Approve dispatch", due: "Today", unitPrice: 74,
    qc: {
      by: "Inline QC Services", date: dayLabel(-1), sample: "200-jar sample (AQL 2.5)", result: "PASS", defects: 0.6, limit: 2.5, fill: "302 g", count: "2,000",
      checks: [
        { label: "Colour & texture vs sample", detail: "Match", result: "Pass" },
        { label: "Taste panel", detail: "3 of 3 approve", result: "Pass" },
        { label: "Seal / leak test", detail: "1 leaker in 200", result: "Pass" },
        { label: "Label & batch code", detail: `Batch GP-1001, MFD ${dayLabel(-2)}`, result: "Pass" },
        { label: "Carton packing", detail: "24 per carton", result: "Pass" },
        { label: "Shrink sleeve alignment", detail: "4 jars off-centre", result: "Minor" },
      ],
    },
    proofs: [proof("QC report uploaded", "Report · AQL 2.5", "0.6% defects vs golden sample", "Yesterday", "/proofs/batch-pickle.jpg")],
  }),
  order({
    id: "SO-1027", product: "Chilli powder 1kg", qty: 1200, uom: "packs", factoryId: "GNT-0057", factory: "Sri Lakshmi Foods", factoryCity: "Guntur", stage: "dispatch", progress: 93, health: "In transit", next: "Delivery ETA", due: dayLabel(1), unitPrice: 310,
    shipment: {
      carrier: "Deccan Road Carriers", lr: "LR 88213", eta: `${dayLabel(1)}, 2 PM`,
      steps: [
        { at: `${dayLabel(-1)} · 18:10`, text: "Picked up from Sri Lakshmi Foods, Guntur", done: true },
        { at: `${dayLabel(0)} · 06:40`, text: "Reached Vijayawada hub", done: true },
        { at: `${dayLabel(0)} · 13:15`, text: "In transit to Hyderabad · on time", done: true },
        { at: "Expected", text: "Arrive Hyderabad DC", done: false },
        { at: "Expected", text: "Unloaded + GRN", done: false },
      ],
      docs: [{ name: "Tax invoice", status: "Received" }, { name: "E-way bill", status: `Valid till ${dayLabel(2)}` }, { name: "Packing list", status: "Received" }, { name: "Certificate of analysis", status: "Pending" }],
      slot: `${dayLabel(1)} · 2–4 PM`, receiver: "Hyderabad East Agencies",
    },
  }),
  order({
    id: "SO-1019", product: "Turmeric 500g", qty: 4000, uom: "packs", factoryId: "NZB-0120", factory: "Indur Spices", factoryCity: "Nizamabad", stage: "delivered", progress: 100, health: "Closing", next: "Complaint window · 5d left", due: dayLabel(5), unitPrice: 96,
    payments: [{ label: "Advance · 20%", pct: 20, status: "paid" }, { label: "Phase 1 · 30%", pct: 30, status: "paid" }, { label: "Phase 2 · 30%", pct: 30, status: "paid" }, { label: "Final · 20%", pct: 20, status: "due" }],
    delivery: { at: `${dayLabel(-2)}, 4:12 PM`, ordered: 4000, received: 3976, damaged: 24, windowEnds: new Date(Date.now() + 5 * DAY + 3 * 3600000).toISOString(), settled: false },
  }),
  order({
    id: "SO-1046", product: "Whey protein bar, 60 g", qty: 5000, uom: "bars", factoryId: "HYD-0142", factory: "Nutrabite Foods", factoryCity: "Hyderabad", stage: "production", progress: 35, health: "On track", next: "30% due at production start", due: dayLabel(3), unitPrice: 28,
    payments: [{ label: "Advance · 20%", pct: 20, status: "paid" }, { label: "Phase 1 · 30%", pct: 30, status: "due" }, { label: "Phase 2 · 30%", pct: 30, status: "later" }, { label: "Final · 20%", pct: 20, status: "later" }],
    proofs: [proof("Sample approved", "Photo · golden sample", "Chocolate, 60 g · retained for QC", dayLabel(-6), "/products/made-peanut-bar.jpg")],
  }),
  order({ id: "SO-1040", product: "Sambar powder 100g", qty: 8000, uom: "packs", factoryId: "NZB-0120", factory: "Indur Spices", factoryCity: "Nizamabad", stage: "production", progress: 66, health: "On track", next: "30% on Phase 2 proof", due: dayLabel(6), unitPrice: 24 }),
  order({ id: "SO-1036", product: "Lemon pickle 250g", qty: 2500, uom: "jars", factoryId: "VJA-0233", factory: "Krishna Pickles", factoryCity: "Vijayawada", stage: "sample", progress: 18, health: "Action", next: "Approve sample", due: "Today", unitPrice: 58 }),
  order({ id: "SO-1044", product: "Masala blend 100g", qty: 6000, uom: "packs", factoryId: "—", factory: "3 factories quoting", factoryCity: "", stage: "enquiry", progress: 5, health: "Action", next: "Pick a quote", due: dayLabel(2), unitPrice: 0 }),
  order({ id: "SO-1045", product: "Tomato pickle 300g", qty: 2000, uom: "jars", factoryId: "—", factory: "2 factories quoting", factoryCity: "", stage: "enquiry", progress: 5, health: "On track", next: "Quotes due", due: dayLabel(3), unitPrice: 0 }),
  order({ id: "SO-1047", product: "Peanut chutney powder", qty: 3000, uom: "packs", factoryId: "—", factory: "Matching", factoryCity: "", stage: "enquiry", progress: 2, health: "On track", next: "Matching factories", due: dayLabel(4), unitPrice: 0 }),
  order({ id: "SO-1043", product: "Garlic pickle 300g", qty: 2000, uom: "jars", factoryId: "GNT-0057", factory: "Sri Lakshmi Foods", factoryCity: "Guntur", stage: "agreed", progress: 10, health: "On track", next: "Advance on e-sign", due: dayLabel(1), unitPrice: 71 }),
  order({ id: "SO-1041", product: "Coriander powder 200g", qty: 5000, uom: "packs", factoryId: "NZB-0120", factory: "Indur Spices", factoryCity: "Nizamabad", stage: "agreed", progress: 12, health: "On track", next: "Sample dispatch", due: dayLabel(5), unitPrice: 33 }),
  order({ id: "SO-1029", product: "Avakaya pickle 1kg", qty: 1500, uom: "jars", factoryId: "GNT-0057", factory: "Sri Lakshmi Foods", factoryCity: "Guntur", stage: "production", progress: 49, health: "On track", next: "Confirm partner unit split", due: dayLabel(3), unitPrice: 168, split: { inhouse: 700, partner: 800, partnerName: "GNT-0091 · vetted" } }),
  // Other brands' orders at the demo factory (HYD-0142); not visible on the Ruchika brand desk.
  order({ id: "SO-2031", brandId: "snackly", product: "Roasted millet chips 60g", qty: 20000, uom: "pouches", factoryId: "HYD-0142", factory: "Nutrabite Foods", factoryCity: "Hyderabad", stage: "production", progress: 62, health: "On track", next: "Batch 3 of 4", due: dayLabel(5), unitPrice: 15.5,
    payments: [{ label: "Advance · 20%", pct: 20, status: "paid" }, { label: "Phase 1 · 30%", pct: 30, status: "paid" }, { label: "Phase 2 · 30%", pct: 30, status: "proof" }, { label: "Final · 20%", pct: 20, status: "later" }] }),
  order({ id: "SO-2024", brandId: "fitfuel", product: "Peanut butter protein bar", qty: 12000, uom: "bars", factoryId: "HYD-0142", factory: "Nutrabite Foods", factoryCity: "Hyderabad", stage: "delivered", progress: 100, health: "Closing", next: "Final 20% after window", due: dayLabel(4), unitPrice: 30,
    payments: [{ label: "Advance · 20%", pct: 20, status: "paid" }, { label: "Phase 1 · 30%", pct: 30, status: "paid" }, { label: "Phase 2 · 30%", pct: 30, status: "paid" }, { label: "Final · 20%", pct: 20, status: "later" }] }),
  order({ id: "SO-2019", brandId: "glowkind", product: "Makhana peri peri 50g", qty: 8000, uom: "pouches", factoryId: "HYD-0142", factory: "Nutrabite Foods", factoryCity: "Hyderabad", stage: "agreed", progress: 10, health: "On track", next: "Advance awaited from buyer", due: dayLabel(2), unitPrice: 22,
    payments: [{ label: "Advance · 20%", pct: 20, status: "due" }, { label: "Phase 1 · 30%", pct: 30, status: "later" }, { label: "Phase 2 · 30%", pct: 30, status: "later" }, { label: "Final · 20%", pct: 20, status: "later" }] }),
];

export const ACTIONS: Action[] = [
  { id: "a1", kind: "Pay", title: "Milestone 2 · 30% for SO-1042", detail: "Phase 1 proof verified · ₹82,800 · due today", cta: "Pay now", orderId: "SO-1042", tone: "blush" },
  { id: "a2", kind: "Sample", title: "Approve sample · Lemon pickle 250g", detail: "Delivered yesterday · becomes the QC reference", cta: "Review", orderId: "SO-1036", tone: "sky" },
  { id: "a3", kind: "Change", title: "Price change request · SO-1038 (+₹1.20/unit)", detail: "Reason: glass jar cost up · justification attached", cta: "Review", orderId: "SO-1038", tone: "rose" },
  { id: "a4", kind: "QC", title: "QC report ready · SO-1031", detail: "0.6% defects vs golden sample · within limit", cta: "Approve dispatch", orderId: "SO-1031", tone: "mint" },
  { id: "a5", kind: "Quote", title: "Quote expires in 2 days · Masala blend 100g", detail: "Frozen price from 3 factories · pick one", cta: "Compare", orderId: "SO-1044", tone: "stone" },
];

// ---------------------------------------------------------------------------
// factory OS (signed in as Nutrabite Foods, unit HYD-0142)
// ---------------------------------------------------------------------------

export const ENQUIRIES: Enquiry[] = [
  { id: "e1", product: "Whey protein bar", source: "Scouthru", moq: 5000, neededBy: dayLabel(30), region: "Hyderabad", fit: "Fits", buyer: "FitFuel (D2C)", receivedHoursAgo: 30, status: "new", notes: "60 g, chocolate and coffee. Box of 6." },
  { id: "e2", product: "Vitamin C serum", source: "IndiaMART", moq: 2000, neededBy: dayLabel(25), region: "Bengaluru", fit: "Not your line", buyer: "Glowkind", receivedHoursAgo: 6, status: "new", notes: "30 ml amber dropper." },
  { id: "e3", product: "Millet chips", source: "Phone call", moq: 10000, neededBy: dayLabel(21), region: "Pune", fit: "Fits", buyer: "Snackly", receivedHoursAgo: 27, status: "new", notes: "Peri peri, 60 g pouch." },
  { id: "e4", product: "Electrolyte drink mix", source: "WhatsApp", moq: 25000, neededBy: dayLabel(35), region: "Dubai", fit: "Needs partner unit", buyer: "HydraMax FZE", receivedHoursAgo: 50, status: "new", notes: "Export, halal required." },
  { id: "e5", product: "Peanut butter", source: "Referral", moq: 3000, neededBy: dayLabel(28), region: "Chennai", fit: "Fits", buyer: "Nutty Co.", receivedHoursAgo: 4, status: "new", notes: "Crunchy, 340 g jar." },
];

export const PARTNER_UNITS = [
  { code: "HYD-0207", city: "Hyderabad", lines: "Bars, granola", free: 30000, licences: ["FSSAI"], shared: 0 },
  { code: "PUN-0087", city: "Pune", lines: "Powders, drink mixes", free: 12000, licences: ["FSSAI", "ISO 22000"], shared: 0 },
  { code: "BLR-0210", city: "Bengaluru", lines: "Health foods", free: 60000, licences: ["FSSAI"], shared: 0 },
];

// ---------------------------------------------------------------------------
// supplier desk (Sri Venkateswara Traders: packaging & raw material)
// ---------------------------------------------------------------------------

const RFQS: State["rfqs"] = [
  { id: "r1", type: "RFQ", item: "6,000 × 500ml glass jars + lids", buyer: "Sri Lakshmi Foods", source: "Scouthru", neededBy: dayLabel(9), city: "Guntur", note: "", stock: "In stock", status: "new" },
  { id: "r2", type: "RFQ", item: "1,200 L groundnut oil", buyer: "Deccan Agro Foods", source: "IndiaMART", neededBy: dayLabel(6), city: "Hyderabad", note: "COA required", stock: "Partial", status: "new" },
  { id: "r3", type: "Reorder", item: "10,000 shrink sleeves (same artwork)", buyer: "Sri Lakshmi Foods", source: "WhatsApp", neededBy: dayLabel(12), city: "Guntur", note: "repeat of PO-2207 · last price ₹1.85", stock: "Make to order", status: "new" },
  { id: "r4", type: "RFQ", item: "400 kg Guntur chilli, S4 grade", buyer: "Indur Spices", source: "TradeIndia", neededBy: dayLabel(12), city: "Nizamabad", note: "moisture ≤ 11%", stock: "In stock", status: "new" },
];

const LEADS: Lead[] = [
  { id: "l1", sources: ["IndiaMART", "WhatsApp"], buyer: "Deccan Agro Foods", city: "Hyderabad", req: `1,200 L groundnut oil · by ${dayLabel(6)}`, fit: "Partial stock", quality: "Genuine", status: "New · 2h ago", next: "Reply within 22h", cta: "Quote" },
  { id: "l2", sources: ["Scouthru"], buyer: "Sri Lakshmi Foods", city: "Guntur", req: "6,000 × 500ml glass jars", fit: "In stock", quality: "Verified", status: "New", next: "Reply today", cta: "Quote" },
  { id: "l3", sources: ["TradeIndia"], buyer: "Indur Spices", city: "Nizamabad", req: "400 kg chilli S4", fit: "In stock", quality: "Genuine", status: `Quoted ${dayLabel(-3)}`, next: "Follow up today", cta: "Follow up" },
  { id: "l4", sources: ["JustDial"], buyer: "Walk-in caller", city: "Secunderabad", req: "50 jars, home use", fit: "Below MOQ", quality: "Likely spam", status: "New", next: "—", cta: "Dismiss" },
  { id: "l5", sources: ["Call", "IndiaMART"], buyer: "Godavari Pickles", city: "Rajahmundry", req: "PET jars 200g · price ask", fit: "In stock", quality: "Genuine", status: `Quoted ${dayLabel(-2)}`, next: `Quote expires ${dayLabel(13)}`, cta: "Open" },
  { id: "l6", sources: ["WhatsApp"], buyer: "Sri Lakshmi Foods", city: "Guntur", req: "10,000 shrink sleeves · repeat", fit: "Make to order", quality: "Repeat buyer", status: "Won → PO-2240", next: `Dispatch ${dayLabel(5)}`, cta: "View PO" },
  { id: "l7", sources: ["IndiaMART"], buyer: "Bulk trader", city: "Delhi", req: 'Bulk jars, "best price"', fit: "Out of radius", quality: "Price-shopping", status: "New", next: "—", cta: "Dismiss" },
];

const POS: PO[] = [
  {
    id: "PO-2231", title: "3,000 × 500ml glass jars", factory: "Sri Lakshmi Foods", city: "Guntur", brandOrder: "SO-1042", stage: "Packed", dispatchBy: "Today", payment: "30 days · not due",
    lines: [{ item: "Glass jar 500ml, flint", qty: 3000, rate: "₹7.40", packed: 3000, batch: "GJ-0927" }, { item: "Lug cap 70mm, gold", qty: 3000, rate: "₹1.90", packed: 3000, batch: "LC-0921" }, { item: "Spare jars (2% breakage)", qty: 60, rate: "Free", packed: 60, batch: "GJ-0927" }],
    docs: [{ name: "Tax invoice", status: "Generated" }, { name: "E-way bill", status: "Generate" }, { name: "Test certificate (food-grade glass)", status: "Attached" }, { name: "Packing list", status: "Generated" }],
    transport: "own", invoice: 32922, photos: [{ label: "Packed pallets", image: "/proofs/packed-boxes.jpg" }, { label: "Loaded vehicle", image: "/proofs/loading-truck.jpg" }],
    activity: [{ at: dayLabel(-9), text: "RFQ received via Scouthru" }, { at: dayLabel(-9), text: "Quote sent · frozen 15 days" }, { at: dayLabel(-8), text: "PO confirmed by Sri Lakshmi Foods" }, { at: "Today", text: "Packed · 3,060 jars, 125 cartons" }],
  },
  { id: "PO-2236", title: "200 kg whey protein concentrate", factory: "Nutrabite Foods", city: "Hyderabad", brandOrder: "SO-1046", stage: "Dispatched", dispatchBy: dayLabel(-1), payment: "GRN pending", lines: [{ item: "Whey protein concentrate 80%, 25 kg bag", qty: 8, rate: "₹9,800", packed: 8, batch: "WPC-0921" }], docs: [{ name: "Tax invoice", status: "Generated" }, { name: "E-way bill", status: "Generated" }, { name: "COA", status: "Attached" }, { name: "Packing list", status: "Generated" }], transport: "partner", invoice: 78400, photos: [{ label: "Bags on pallet", image: "/proofs/warehouse-racks.jpg" }], activity: [{ at: dayLabel(-4), text: "PO confirmed by Nutrabite Foods" }, { at: dayLabel(-1), text: "Dispatched via Deccan Road Carriers" }] },
  { id: "PO-2228", title: "800 L groundnut oil", factory: "Deccan Agro Foods", city: "Hyderabad", brandOrder: "SO-1038", stage: "Dispatched", dispatchBy: dayLabel(-3), payment: "GRN pending", lines: [{ item: "Groundnut oil, cold-pressed, 15 L tin", qty: 54, rate: "₹2,640", packed: 54, batch: "GO-0918" }], docs: [{ name: "Tax invoice", status: "Generated" }, { name: "E-way bill", status: "Generated" }, { name: "COA", status: "Attached" }, { name: "Packing list", status: "Generated" }], transport: "partner", invoice: 142560, photos: [{ label: "Loaded tins", image: "/proofs/loading-truck.jpg" }], activity: [{ at: dayLabel(-6), text: "PO confirmed" }, { at: dayLabel(-3), text: "Dispatched via Deccan Road Carriers" }] },
  { id: "PO-2219", title: "5,000 PET jars 200g", factory: "Krishna Pickles", city: "Vijayawada", brandOrder: "SO-1031", stage: "Paid", dispatchBy: dayLabel(-11), payment: "Received", lines: [{ item: "PET jar 200g, clear 63mm", qty: 5000, rate: "₹6.20", packed: 5000, batch: "PJ-0901" }], docs: [{ name: "Tax invoice", status: "Generated" }, { name: "E-way bill", status: "Generated" }, { name: "Packing list", status: "Generated" }, { name: "Food-contact certificate", status: "Attached" }], transport: "own", invoice: 31000, photos: [], activity: [{ at: dayLabel(-11), text: "Dispatched" }, { at: dayLabel(-4), text: "Payment received" }] },
  { id: "PO-2215", title: "12,000 pouches 1kg", factory: "Sri Lakshmi Foods", city: "Guntur", brandOrder: "SO-1027", stage: "Overdue pay", dispatchBy: dayLabel(-18), payment: "18 days late · reminder sent", lines: [{ item: "Laminated pouch 1kg, printed", qty: 12000, rate: "₹4.10", packed: 12000, batch: "LP-0829" }], docs: [{ name: "Tax invoice", status: "Generated" }, { name: "E-way bill", status: "Generated" }, { name: "Packing list", status: "Generated" }, { name: "GRN", status: "Attached" }], transport: "own", invoice: 49200, photos: [], activity: [{ at: dayLabel(-18), text: "Dispatched" }, { at: dayLabel(-1), text: "Payment reminder sent" }] },
];

const STOCK: StockItem[] = [
  { name: "Glass jar 500ml", spec: "Flint, 70mm neck", onHand: 12800, reserved: 3060, moq: "1,000", band: "₹7.10–7.60", lead: "Same day", status: "Low vs demand" },
  { name: "Lug cap 70mm", spec: "Gold, plastisol", onHand: 22000, reserved: 3000, moq: "2,000", band: "₹1.80–2.05", lead: "Same day", status: "Healthy" },
  { name: "Groundnut oil", spec: "Cold-pressed, 15 L tin", onHand: 2400, reserved: 800, moq: "150 L", band: "₹172–184/L", lead: "1 day", status: "9 days cover", uom: "L" },
  { name: "PET jar 200g", spec: "Clear, 63mm", onHand: 18500, reserved: 0, moq: "2,000", band: "₹6.00–6.50", lead: "Same day", status: "Healthy" },
  { name: "Shrink sleeve", spec: "Custom print", onHand: null, reserved: null, moq: "5,000", band: "₹1.70–1.95", lead: "7 days", status: "MTO" },
];

// ---------------------------------------------------------------------------
// distributor desk (Hyderabad East Agencies)
// ---------------------------------------------------------------------------

const RETAILER_ORDERS: RetailerOrder[] = [
  { id: "ro1", retailer: "Sri Balaji Kirana", area: "Uppal", source: "WhatsApp", lines: 12, value: 18450, route: "Route A · van 1", scheme: "Buy 10 get 1", credit: "OK", status: "Picked", stock: "All in", inbox: "Call" },
  { id: "ro2", retailer: "Ratna Supermarket", area: "Habsiguda", source: "Salesman", lines: 28, value: 46200, route: "Route A · van 1", scheme: "—", credit: "OK", status: "Short 2 SKUs", stock: "Short 2", inbox: "Udaan + Salesman" },
  { id: "ro3", retailer: "Lakshmi Stores", area: "Nacharam", source: "WhatsApp voice", lines: 7, value: 6340, route: "Route B · van 2", scheme: "—", credit: "OK", status: "New", stock: "All in", inbox: "WhatsApp voice" },
  { id: "ro4", retailer: "FreshMart", area: "Tarnaka", source: "Scouthru", lines: 19, value: 31780, route: "Route B · van 2", scheme: "Buy 10 get 1", credit: "Over limit", status: "Credit hold", stock: "All in", inbox: "Salesman" },
  { id: "ro5", retailer: "City Provisions", area: "Malkajgiri", source: "Salesman", lines: 9, value: 8920, route: "Route C", scheme: "—", credit: "Cash", status: "Delivered", stock: "All in", inbox: "WhatsApp" },
  { id: "ro6", retailer: "New retailer · Uppal", area: "Uppal", source: "ONDC", lines: 5, value: 4210, route: "Route A · van 1", scheme: "—", credit: "Prepaid", status: "New", stock: "All in", inbox: "ONDC" },
];

const QUOTES: Quote[] = [
  { id: "q-1044-a", orderId: "SO-1044", unit: "GNT-0057", factory: "Sri Lakshmi Foods", city: "Guntur", price: 21.5, lead: 14, moq: 3000, rating: 4.7, note: "Same blend as our retail range, own label.", fit: 100, status: "sent", at: dayLabel(-2) },
  { id: "q-1044-b", orderId: "SO-1044", unit: "NZB-0120", factory: "Indur Spices", city: "Nizamabad", price: 19.8, lead: 18, moq: 5000, rating: 4.5, note: "Cryo-ground, aroma retained.", fit: 100, status: "sent", at: dayLabel(-2) },
  { id: "q-1044-c", orderId: "SO-1044", unit: "HYD-0517", factory: "Deccan Agro Foods", city: "Hyderabad", price: 22.4, lead: 10, moq: 2000, rating: 4.4, note: "70% in-house, 30% with a vetted partner unit.", fit: 70, status: "sent", at: dayLabel(-1) },
  { id: "q-1045-a", orderId: "SO-1045", unit: "VJA-0233", factory: "Krishna Pickles", city: "Vijayawada", price: 61, lead: 20, moq: 2000, rating: 4.3, note: "Glass jar and shrink sleeve included.", fit: 100, status: "sent", at: dayLabel(-1) },
];

const CASES: Case[] = [
  { id: "cs1", kind: "Delivery issue", title: "SO-1019 · 24 packs short", detail: "Turmeric 500g: 2 cartons crushed in transit. Brand wants a deduction from the final payment.", from: "Ruchika Foods", orderId: "SO-1019", status: "Open", at: dayLabel(-1) },
  { id: "cs2", kind: "Assisted sourcing", title: "Sugar-free gummies, 10,000 jars", detail: "Brand asked Scouthru to run the order end to end under Assured.", from: "Glowkind", status: "In progress", at: dayLabel(-3) },
];

export function seed(): State {
  return {
    v: 5,
    view: null,
    products: PRODUCTS,
    units: UNITS,
    orders: ORDERS,
    actions: ACTIONS,
    enquiries: ENQUIRIES,
    partnerUnits: PARTNER_UNITS,
    capacity: {
      line: "Protein bars line", total: 100000, booked: 75000, nextQ: 40,
      months: [{ m: "Oct", booked: 92 }, { m: "Nov", booked: 78 }, { m: "Dec", booked: 55 }, { m: "Jan", booked: 46 }, { m: "Feb", booked: 38 }, { m: "Mar", booked: 36 }],
    },
    rfqs: RFQS,
    leads: LEADS,
    pos: POS,
    stock: STOCK,
    inbound: [
      { id: "in1", brand: "Ruchika Foods", item: "Chilli powder 1kg × 1,200", meta: `SO-1027 · arrives ${dayLabel(1)}, 2 PM · dock 2`, status: "In transit" },
      { id: "in2", brand: "Spicewell", item: "Masala 100g × 4,000", meta: "Arrived 10:40 · GRN not done", status: "Receive" },
      { id: "in3", brand: "Amma Pickles", item: "Pickles assorted × 960", meta: `Received ${dayLabel(-3)} · 12 damaged · claim open`, status: "Claim" },
    ],
    grn: {
      confirmed: false,
      claimSent: false,
      photos: [{ label: "Truck seal", image: "/proofs/delivery-van.jpg" }, { label: "Damaged cartons (2)", image: "/proofs/crushed-cartons.jpg" }, { label: "Signed LR copy", image: "/proofs/signed-form.jpg" }],
      lines: [
        { sku: "Garam masala", pack: "100g · 48/carton", invoiced: 2400, received: 2400, damaged: 0, batch: "GM-0918", expiry: "Sep 2027" },
        { sku: "Chicken masala", pack: "100g · 48/carton", invoiced: 1600, received: 1552, damaged: 48, batch: "CM-0915", expiry: "Sep 2027" },
        { sku: "Sambar powder", pack: "50g · 96/carton", invoiced: 1440, received: 1368, damaged: 72, batch: "SP-0910", expiry: "Mar 2027" },
        { sku: "Turmeric", pack: "50g · 96/carton", invoiced: 960, received: 960, damaged: 0, batch: "TU-0902", expiry: "Mar 2027" },
      ],
    },
    retailerOrders: RETAILER_ORDERS,
    overdueRetailers: [{ name: "FreshMart", amount: 38400, days: 42, sent: false }, { name: "Annapurna Stores", amount: 9150, days: 24, sent: false }, { name: "Vijaya Traders", amount: 6720, days: 18, sent: false }],
    claims: [{ brand: "Ruchika Foods", what: "Buy 10 get 1 · 86 free packs given", amount: 8170, status: "Submitted" }, { brand: "Spicewell", what: "Display incentive · 12 outlets", amount: 6000, status: "Approved" }, { brand: "Amma Pickles", what: "Expiry returns · 140 packs", amount: 4480, status: "Pending proof" }],
    alerts: [
      { id: "al1", kind: "Stockout", title: "Mango pickle 500g · 2 days left", detail: `Selling 140/day · next brand lot ${dayLabel(3)}`, cta: "Order from brand" },
      { id: "al2", kind: "Expiry", title: "Masala 50g · 320 packs expire in 45 days", detail: "Push via scheme or return", cta: "Plan" },
      { id: "al3", kind: "Slow", title: "Turmeric 1kg · no sale in 21 days", detail: "₹42K stuck", cta: "Review" },
      { id: "al4", kind: "Scheme", title: `Ruchika Foods · buy 10 get 1, till ${dayLabel(12)}`, detail: "Pass to retailers on today's orders", cta: "Apply" },
    ],
    routes: [
      { name: "Route A · Van 1", area: "Uppal, Habsiguda", driver: "driver Ravi", stops: 7, delivered: 3, value: 84000, collect: 52000, collected: 21000, status: "Out", note: "" },
      { name: "Route B · Van 2", area: "Nacharam, Tarnaka", driver: "driver Suresh", stops: 6, delivered: 0, value: 61000, collect: 38000, collected: 0, status: "Loading", note: "Leaves 11:30" },
      { name: "Route C · Bike", area: "Malkajgiri", driver: "salesman Imran", stops: 5, delivered: 5, value: 22000, collect: 22000, collected: 22000, status: "Done", note: "" },
    ],
    requirements: [],
    samples: [],
    quotes: QUOTES,
    cases: CASES,
    notices: [
      { id: "n1", to: "brand", text: "3 frozen quotes in for Masala blend 100g", href: "/brand", at: dayLabel(-1), read: false },
      { id: "n2", to: "brand", text: "QC report ready for SO-1031", href: "/brand/qc/SO-1031", at: dayLabel(-1), read: false },
      { id: "n3", to: "factory", text: "New enquiry: Peanut butter, 3,000 units (Referral)", href: "/factory", at: dayLabel(0), read: false },
      { id: "n4", to: "supplier", text: "Reorder on WhatsApp: 10,000 shrink sleeves", href: "/supplier/requests", at: dayLabel(0), read: false },
      { id: "n5", to: "distributor", text: "Spicewell shipment at the dock, GRN pending", href: "/distributor/inbound", at: dayLabel(0), read: false },
      { id: "n6", to: "admin", text: "New delivery issue on SO-1019", href: "/admin/cases", at: dayLabel(-1), read: false },
    ],
    connected: [],
    qcVisits: [
      { id: "qv1", orderId: "SO-1042", unit: "GNT-0057", agent: "Inline QC Services · Ravi", date: dayLabel(11), status: "Scheduled" },
      { id: "qv2", orderId: "SO-1031", unit: "VJA-0233", agent: "Inline QC Services · Meena", date: dayLabel(-1), status: "Done" },
      { id: "qv3", orderId: "SO-1046", unit: "HYD-0142", agent: "Inline QC Services · Ravi", date: dayLabel(9), status: "Scheduled" },
    ],
  };
}
