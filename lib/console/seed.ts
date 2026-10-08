import { networkSeed } from "./seed-network";
import type {
  ConsoleState, Enquiry, EnquiryStage, Manufacturer, Milestone, PaymentPlan, Product, ProductStage, QualityBatch, Sample,
  SampleStatus, Shipment, ShipStatus,
} from "./types";

/**
 * Starting data for the console, taken from the mockups' names, numbers and
 * statuses. Times are relative to when the demo is first opened, so "2 hours
 * ago" stays true and due dates stay ahead.
 */

export const CONSOLE_VERSION = 3;

const H = 3600e3;
const D = 24 * H;

const IMG = {
  multivitamin: "/console/p-multivitamin.jpg",
  collagenPowder: "/console/p-collagen-powder.jpg",
  vitcGummies: "/console/p-vitc-gummies.jpg",
  retinol: "/console/p-retinol.jpg",
  plantProtein: "/console/p-plant-protein.jpg",
  omega3: "/console/p-omega3.jpg",
  hairSerum: "/console/p-hair-serum.jpg",
  proteinBar: "/console/p-protein-bar.jpg",
  immunity: "/console/p-immunity-gummies.jpg",
  sachets: "/console/p-collagen-sachets.jpg",
  pump: "/console/p-hair-serum-pump.jpg",
  vitd3: "/console/p-vitd3-gummies.jpg",
  greens: "/console/p-greens.jpg",
  vitcTablets: "/console/p-vitc-tablets.jpg",
  ashwagandha: "/console/p-ashwagandha.jpg",
};
export const PRODUCT_IMAGES = IMG;

const PEOPLE = {
  priya: { name: "Priya Sharma", img: "/console/av-priya-sm.jpg" },
  rohit: { name: "Rohit Mehta", img: "/console/av-rohit.jpg" },
  anjali: { name: "Anjali Desai", img: "/console/av-anjali.jpg" },
  amit: { name: "Amit Verma", img: "/console/av-amit.jpg" },
};

function mfr(p: Partial<Manufacturer> & Pick<Manufacturer, "id" | "name" | "city" | "state" | "img">): Manufacturer {
  return {
    short: p.name.split(" ")[0],
    rating: 4.5,
    reviews: 60,
    certs: ["GMP", "ISO"],
    capabilities: ["Capsules", "Tablets"],
    moq: 25000,
    responseDays: [2, 3],
    about: `${p.name} is a contract manufacturer in ${p.state} making private-label supplements and wellness products for brands in India and abroad.`,
    years: 8,
    brands: 200,
    unitsPerMonth: "1M+",
    sqft: "30,000",
    categories: ["Capsules", "Tablets", "Powders"],
    onTime: 94,
    qualityIssues: 1.2,
    avgResponse: 2.6,
    shortlisted: false,
    contacted: false,
    contacts: [{ name: "Rohit Mehta", role: "Account Manager", img: PEOPLE.rohit.img, email: "rohit@example.in", phone: "+91 98200 11223" }],
    ...p,
  };
}

const MANUFACTURERS: Manufacturer[] = [
  mfr({
    id: "nutralab", name: "NutraLab Manufacturing", short: "NutraLab", city: "Ahmedabad", state: "Gujarat", img: "/console/f-nutralab-sq.jpg",
    rating: 4.8, reviews: 124, certs: ["GMP", "FSSAI", "ISO 22000", "HACCP", "Halal"], capabilities: ["Capsules", "Tablets", "Powders", "Gummies"],
    moq: 10000, responseDays: [1, 2], years: 10, brands: 500, unitsPerMonth: "2M+", sqft: "50,000", categories: ["Capsules", "Tablets", "Powders", "Gummies"],
    about: "NutraLab Manufacturing is a leading nutraceutical manufacturer specializing in high-quality dietary supplements, with state-of-the-art facilities and global compliance standards. 10+ years of experience serving 500+ brands worldwide.",
    onTime: 98, qualityIssues: 0.8, avgResponse: 2.1, shortlisted: true, contacted: true,
    contacts: [
      { name: "Rohit Mehta", role: "Account Manager", img: PEOPLE.rohit.img, email: "rohit.mehta@nutralab.example", phone: "+91 98250 40112" },
      { name: "Anjali Desai", role: "Production Head", img: PEOPLE.anjali.img, email: "anjali.desai@nutralab.example", phone: "+91 98250 40187" },
    ],
  }),
  mfr({ id: "pureform", name: "PureForm Labs", city: "Pune", state: "Maharashtra", img: "/console/f-pureform-sq.jpg", rating: 4.7, reviews: 89, certs: ["GMP", "ISO", "FSSAI"], capabilities: ["Capsules", "Softgels", "Liquid", "Powders"], moq: 25000, responseDays: [2, 3], shortlisted: true, contacted: true, onTime: 95, categories: ["Capsules", "Softgels", "Powders", "Skincare"] }),
  mfr({ id: "mahafresh", name: "MahaFresh Foods", city: "Chennai", state: "Tamil Nadu", img: "/console/f-mahafresh-sq.jpg", rating: 4.6, reviews: 76, certs: ["FSSAI", "ISO", "HACCP"], capabilities: ["Gummies", "Tablets", "Functional Foods"], moq: 50000, responseDays: [2, 4], shortlisted: true, contacted: true, onTime: 93, categories: ["Gummies", "Bars", "Functional Foods"] }),
  mfr({ id: "vitagen", name: "VitaGen Nutraceuticals", city: "Gurugram", state: "Haryana", img: "/console/f-vitagen-sq.jpg", rating: 4.5, reviews: 62, certs: ["GMP", "ISO", "FSSAI", "Halal"], capabilities: ["Capsules", "Tablets", "Sports Nutrition"], moq: 25000, responseDays: [3, 4], shortlisted: true, contacted: true, onTime: 90 }),
  mfr({ id: "herbaveda", name: "HerbaVeda Labs", city: "Bengaluru", state: "Karnataka", img: "/console/f-herbaveda-sq.jpg", rating: 4.4, reviews: 58, certs: ["GMP", "FSSAI", "Halal"], capabilities: ["Herbal Extracts", "Capsules", "Teas"], moq: 10000, responseDays: [1, 3], shortlisted: true, contacted: true, onTime: 92 }),
  mfr({ id: "nutripro", name: "NutriPro Biotech", city: "Hyderabad", state: "Telangana", img: "/console/f-nutripro-sq.jpg", rating: 4.3, reviews: 41, certs: ["GMP", "ISO"], capabilities: ["Tablets", "Effervescent", "Sachets"], moq: 50000, responseDays: [3, 5], contacted: true, onTime: 89 }),
  mfr({ id: "greenleaf", name: "GreenLeaf Organics", city: "Noida", state: "Uttar Pradesh", img: "/console/f-greenleaf-sq.jpg", rating: 4.2, reviews: 39, certs: ["FSSAI", "USDA", "ISO"], capabilities: ["Organic Supplements", "Plant Extracts"], moq: 25000, responseDays: [3, 5], shortlisted: true, onTime: 88 }),
  mfr({ id: "wellplus", name: "WellPlus Manufacturing", city: "Vadodara", state: "Gujarat", img: "/console/f-wellplus-sq.jpg", rating: 4.1, reviews: 28, certs: ["GMP", "ISO"], capabilities: ["Capsules", "Liquids", "Personal Care"], moq: 100000, responseDays: [4, 6], shortlisted: true, onTime: 86, categories: ["Liquids", "Personal Care"] }),
];

type EnqSeed = [name: string, img: string, category: string, mfrCount: number, moq: number, stage: EnquiryStage, hoursAgo: number];
const ENQ: EnqSeed[] = [
  ["Daily Multivitamin Capsules", IMG.multivitamin, "Supplements", 8, 50000, "In Discussion", 2],
  ["Collagen Peptides Powder", IMG.collagenPowder, "Supplements", 6, 25000, "Samples Requested", 26],
  ["Vitamin C Gummies", IMG.vitcGummies, "Supplements", 10, 100000, "In Production", 50],
  ["Retinol Face Cream", IMG.retinol, "Skincare", 5, 30000, "In Discussion", 74],
  ["Plant Protein Powder", IMG.plantProtein, "Food & Beverages", 7, 50000, "Quote Received", 98],
  ["Omega 3 Softgels", IMG.omega3, "Supplements", 6, 100000, "Samples Requested", 122],
  ["Hair Growth Serum", IMG.hairSerum, "Personal Care", 4, 20000, "Draft", 146],
  ["Protein Bar (Chocolate)", IMG.proteinBar, "Food & Beverages", 9, 100000, "In Discussion", 170],
  ["Immunity Gummies", IMG.immunity, "Supplements", 5, 30000, "In Discussion", 200],
  ["Collagen Sachets", IMG.sachets, "Supplements", 9, 25000, "In Discussion", 230],
  ["Vitamin D3 Gummies", IMG.vitd3, "Supplements", 6, 20000, "In Production", 260],
  ["Ashwagandha Capsules", IMG.ashwagandha, "Supplements", 7, 30000, "Samples Requested", 290],
  ["Greens Superfood Powder", IMG.greens, "Food & Beverages", 4, 15000, "In Discussion", 320],
  ["Vitamin C Tablets", IMG.vitcTablets, "Supplements", 6, 50000, "Closed", 350],
  ["Biotin Hair Gummies", IMG.immunity, "Personal Care", 5, 25000, "In Discussion", 380],
  ["Whey Protein Isolate", IMG.plantProtein, "Food & Beverages", 8, 40000, "Quote Received", 410],
  ["Night Repair Cream", IMG.retinol, "Skincare", 3, 10000, "In Discussion", 440],
  ["Electrolyte Sachets", IMG.sachets, "Food & Beverages", 6, 60000, "Samples Requested", 470],
  ["Probiotic Capsules", IMG.multivitamin, "Supplements", 5, 30000, "In Production", 500],
  ["Fish Oil Softgels", IMG.omega3, "Supplements", 4, 50000, "Closed", 530],
  ["Herbal Green Tea Blend", IMG.greens, "Food & Beverages", 3, 20000, "In Discussion", 560],
  ["Multivitamin Gummies", IMG.immunity, "Supplements", 6, 40000, "In Production", 590],
  ["Argan Hair Oil", IMG.pump, "Personal Care", 4, 15000, "Closed", 620],
  ["Magnesium Tablets", IMG.vitcTablets, "Supplements", 5, 30000, "Samples Requested", 650],
];

const MFR_IDS = MANUFACTURERS.map((m) => m.id);

function buildEnquiries(now: number): Enquiry[] {
  return ENQ.map(([name, img, category, mfrCount, moq, stage, h], i) => {
    const n = i + 1;
    const updated = now - h * H;
    const responders = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => MFR_IDS[(k + i) % MFR_IDS.length]).slice(0, Math.min(mfrCount, 8));
    const first = i === 0;
    const responses = responders.map((id, k) => ({
      mfrId: id,
      status: (first ? (["Quote Received", "Quote Received", "Shared Proposal"] as const)[k] ?? (k < 4 ? "Quote Received" : "Awaiting Reply") : k < 3 ? "Quote Received" : k < 5 ? "Shared Proposal" : "Awaiting Reply") as Enquiry["responses"][number]["status"],
      at: new Date(updated - (k + 1) * 5 * H).toISOString(),
      note: k % 2 ? "Can match the spec with our in-house formula; COA on request." : "Shared capability deck and indicative pricing.",
    }));
    const quotes = responses.filter((r) => r.status === "Quote Received").map((r, k) => ({
      mfrId: r.mfrId,
      unitPrice: +(first ? [8.4, 9.1, 10.2, 11.5][k] ?? 9 : 6 + ((i * 7 + k * 3) % 9)).toFixed(2),
      moq: moq * (k % 2 ? 1 : 0.8),
      leadWeeks: 4 + ((i + k) % 5),
      validTill: new Date(now + (15 + k) * D).toISOString(),
      shortlisted: k === 0,
    }));
    const isMulti = first;
    return {
      id: `ENQ-2026-${String(n).padStart(3, "0")}`,
      name,
      img,
      category,
      tags: isMulti ? ["Supplements", "Capsules", "Vitamins"] : [category, name.split(" ").slice(-1)[0]],
      mfrCount,
      moq,
      stage,
      updatedAt: new Date(updated).toISOString(),
      createdAt: new Date(updated - 9 * D).toISOString(),
      launch: isMulti ? "Q4 2026" : ["Q1 2027", "Q4 2026", "Q2 2027"][i % 3],
      price: isMulti ? "₹ 8–12 / unit" : `₹ ${5 + (i % 6)}–${9 + (i % 6)} / unit`,
      brief: isMulti
        ? "Looking for a high-quality daily multivitamin capsule with essential vitamins and minerals. Prefer clean label, vegetarian capsules, and third-party certifications (GMP, FSSAI, ISO)."
        : `Looking for a reliable manufacturing partner for ${name.toLowerCase()} under our own label. Clean label, export-ready packaging and full test reports preferred.`,
      requirements: isMulti
        ? ["Vegetarian Capsules", "GMP Certified", "Custom Formula", "Clean Label", "Third-party Testing", "Export Ready"]
        : ["GMP Certified", "Clean Label", "Third-party Testing", "Export Ready"],
      responses,
      quotes,
      steps: [
        { text: "Review manufacturer responses", due: new Date(updated).toISOString(), done: stage !== "Draft" },
        { text: "Compare quotes and shortlists", due: new Date(now + 2 * D).toISOString(), done: ["Samples Requested", "In Production", "Closed"].includes(stage) },
        { text: "Request samples from selected manufacturers", due: new Date(now + 4 * D).toISOString(), done: ["Samples Requested", "In Production", "Closed"].includes(stage) },
        { text: "Finalize manufacturer and move to contract", due: new Date(now + 8 * D).toISOString(), done: ["In Production", "Closed"].includes(stage) },
      ],
      activity: [
        { at: new Date(updated - 9 * D).toISOString(), who: "Priya Sharma", text: "Created enquiry" },
        { at: new Date(updated - 6 * D).toISOString(), who: "Scouthru", text: `Sent to ${mfrCount} matched manufacturers` },
        { at: new Date(updated).toISOString(), who: "Priya Sharma", text: `Stage set to ${stage}` },
      ],
    };
  });
}

function sample(now: number, p: { id: string; name: string; img: string; mfrId: string; rev: number; qty: number; status: SampleStatus; daysAgo: number; tags?: string[]; desc?: string; enquiryId?: string }): Sample {
  const req = now - p.daysAgo * D;
  return {
    id: p.id,
    name: p.name,
    img: p.img,
    mfrId: p.mfrId,
    rev: p.rev,
    qty: p.qty,
    unit: /Capsules|Softgels/.test(p.name) ? "capsules" : "units",
    requestedAt: new Date(req).toISOString(),
    leadTime: "2–3 weeks",
    status: p.status,
    tags: p.tags ?? ["Supplements"],
    desc: p.desc ?? `${p.name} sample made to the agreed brief for evaluation before bulk production.`,
    specs: [
      ["Form", /Capsules/.test(p.name) ? "Capsule (Size 0)" : /Gummies/.test(p.name) ? "Gummy (4 g)" : /Powder/.test(p.name) ? "Powder" : "As per brief"],
      ["Active Ingredient", /Ashwagandha/.test(p.name) ? "Ashwagandha Extract (KSM-66)" : "As per formula"],
      ["Strength", /Ashwagandha/.test(p.name) ? "600 mg per capsule" : "As per label claim"],
      ["Composition", "Herbal extract, plant-based capsule"],
      ["Color", "Natural beige"],
      ["Flavor / Taste", "Neutral"],
      ["Shelf Life (Target)", "24 months"],
      ["Recommended Use", "1–2 capsules daily"],
      ["Certifications (Target)", "GMP, FSSAI, ISO"],
    ],
    evaluation: [
      { label: "Appearance", status: "Pass", note: "Uniform size and color" },
      { label: "Odor", status: "Pass", note: "Mild herbal aroma" },
      { label: "Taste", status: "Pass", note: "As expected" },
      { label: "Texture", status: "Pass", note: "Smooth capsule surface" },
      { label: "Disintegration", status: p.status === "Approved" ? "Pass" : "Testing", note: p.status === "Approved" ? "Within 30 minutes" : "Lab testing in progress" },
      { label: "Assay (Active Content)", status: p.status === "Approved" ? "Pass" : "Testing", note: p.status === "Approved" ? "98.6% of label claim" : "Results expected soon" },
      { label: "Microbial Limits", status: p.status === "Approved" ? "Pass" : "Not Started", note: p.status === "Approved" ? "Within limits" : "Scheduled after initial review" },
    ],
    comments: [],
    packaging: ["/console/pk-main.jpg", "/console/pk-1.jpg", "/console/pk-2.jpg", "/console/pk-3.jpg"],
    attachments: ["Formulation_Sheet.pdf", "COA_Draft.pdf", "Label_Artwork_v2.pdf", "Stability_Plan.pdf"],
    enquiryId: p.enquiryId,
    history: [{ status: "Submitted", at: new Date(req).toISOString() }, ...(p.status !== "Submitted" && p.status !== "Draft" ? [{ status: "In Review" as SampleStatus, at: new Date(req + 3 * D).toISOString() }] : [])],
  };
}

function buildSamples(now: number): Sample[] {
  const ash = sample(now, {
    id: "SMP-2026-0187", name: "Ashwagandha Capsules", img: IMG.ashwagandha, mfrId: "nutralab", rev: 2, qty: 1000, status: "In Review", daysAgo: 3,
    tags: ["Supplements", "Capsules", "Herbal Blend", "Vegan"], desc: "A premium ashwagandha extract in easy-to-take capsules, formulated for daily stress support and overall wellness.", enquiryId: "ENQ-2026-012",
  });
  ash.comments = [
    { at: new Date(now - 2 * D - 5 * H).toISOString(), who: "Priya Sharma", text: "Initial samples look good. Please proceed with stability testing and share the COA once available." },
    { at: new Date(now - 1 * D - 3 * H).toISOString(), who: "Rohit Mehta", text: "Thank you Priya. Stability testing is in progress and we will share the COA within 3 days." },
    { at: new Date(now - 6 * H).toISOString(), who: "Priya Sharma", text: "Great. Please also confirm the final packaging artwork for the next round." },
  ];
  return [
    ash,
    sample(now, { id: "SMP-2026-0186", name: "Collagen Peptides Powder", img: IMG.collagenPowder, mfrId: "pureform", rev: 1, qty: 500, status: "Testing", daysAgo: 5, enquiryId: "ENQ-2026-002" }),
    sample(now, { id: "SMP-2026-0185", name: "Vitamin C Gummies", img: IMG.vitcGummies, mfrId: "mahafresh", rev: 1, qty: 2000, status: "Feedback", daysAgo: 8, enquiryId: "ENQ-2026-003" }),
    sample(now, { id: "SMP-2026-0184", name: "Retinol Face Cream", img: IMG.retinol, mfrId: "pureform", rev: 3, qty: 300, status: "Draft", daysAgo: 1, enquiryId: "ENQ-2026-004" }),
    sample(now, { id: "SMP-2026-0183", name: "Protein Bar (Chocolate)", img: IMG.proteinBar, mfrId: "mahafresh", rev: 1, qty: 1000, status: "Approved", daysAgo: 20, enquiryId: "ENQ-2026-008" }),
    sample(now, { id: "SMP-2026-0182", name: "Omega 3 Softgels", img: IMG.omega3, mfrId: "nutralab", rev: 1, qty: 500, status: "Submitted", daysAgo: 2, enquiryId: "ENQ-2026-006" }),
    sample(now, { id: "SMP-2026-0192", name: "Vitamin D3 Gummies", img: IMG.vitd3, mfrId: "mahafresh", rev: 1, qty: 800, status: "In Review", daysAgo: 4, enquiryId: "ENQ-2026-011" }),
    sample(now, { id: "SMP-2026-0175", name: "Daily Multivitamin Capsules", img: IMG.multivitamin, mfrId: "nutralab", rev: 2, qty: 1000, status: "Approved", daysAgo: 60 }),
    sample(now, { id: "SMP-2026-0179", name: "Electrolyte Sachets", img: IMG.sachets, mfrId: "nutripro", rev: 1, qty: 600, status: "In Review", daysAgo: 6, enquiryId: "ENQ-2026-018" }),
    sample(now, { id: "SMP-2026-0180", name: "Magnesium Tablets", img: IMG.vitcTablets, mfrId: "vitagen", rev: 1, qty: 500, status: "Testing", daysAgo: 7, enquiryId: "ENQ-2026-024" }),
    sample(now, { id: "SMP-2026-0181", name: "Collagen Sachets", img: IMG.sachets, mfrId: "pureform", rev: 2, qty: 400, status: "Feedback", daysAgo: 9 }),
    sample(now, { id: "SMP-2026-0178", name: "Immunity Gummies", img: IMG.immunity, mfrId: "mahafresh", rev: 1, qty: 700, status: "Submitted", daysAgo: 1 }),
    sample(now, { id: "SMP-2026-0177", name: "Plant Protein Powder", img: IMG.plantProtein, mfrId: "pureform", rev: 1, qty: 300, status: "Testing", daysAgo: 10 }),
    sample(now, { id: "SMP-2026-0176", name: "Greens Superfood Powder", img: IMG.greens, mfrId: "greenleaf", rev: 1, qty: 300, status: "In Review", daysAgo: 4 }),
  ];
}

function buildOrders(now: number) {
  const iso = (d: number) => new Date(now + d * D).toISOString();
  return [
    {
      id: "ORD-2026-0042", name: "Daily Multivitamin Capsules", img: IMG.multivitamin, tags: ["Supplements", "Capsules", "Private Label"],
      desc: "A premium daily multivitamin formulated for overall wellness and daily nutritional support.", mfrId: "nutralab", qty: 50000, unitFormat: "Capsules (Size 0)",
      createdAt: iso(-90), briefAt: iso(-90), sampleAt: iso(-74), productionAt: iso(-46), targetDelivery: iso(26), incoterms: "FOB Gujarat", destination: "Mumbai, India", confirmed: true,
      batches: [
        { id: "BATCH-001", planned: 10000, completed: 10000, status: "Completed" as const, start: iso(-46), end: iso(-39) },
        { id: "BATCH-002", planned: 10000, completed: 10000, status: "Completed" as const, start: iso(-36), end: iso(-28) },
        { id: "BATCH-003", planned: 10000, completed: 8000, status: "In Progress" as const, start: iso(-25), end: iso(-18) },
        { id: "BATCH-004", planned: 10000, completed: 0, status: "Pending" as const, start: iso(-13), end: iso(-6) },
        { id: "BATCH-005", planned: 10000, completed: 0, status: "Pending" as const, start: iso(-1), end: iso(6) },
      ],
      updates: [
        { at: iso(-25), text: "Batch 003 production started.", img: "/console/upd-line.jpg" },
        { at: iso(-29), text: "Raw materials verified and released for Batch 003." },
        { at: iso(-29.2), text: "Batch 002 completed (10,000 units)." },
        { at: iso(-36), text: "Batch 002 production started." },
      ],
      evidence: [
        { img: "/console/ev-1.jpg", label: "In-process testing", batch: "Batch 003" },
        { img: "/console/ev-2.jpg", label: "Finished product sample", batch: "Batch 002" },
        { img: "/console/ev-3.jpg", label: "Capsule appearance check", batch: "Batch 002" },
        { img: "/console/ev-4.jpg", label: "Microbial testing", batch: "Batch 002" },
        { img: "/console/ev-5.jpg", label: "Packaging line", batch: "Batch 002" },
      ],
      issues: [
        { id: "ISS-01", title: "Batch 003 yield slightly lower", detail: "Current yield at 96.2% (vs. 98% target). No impact on delivery timeline.", level: "Medium" as const, at: iso(-25), resolved: false, ref: "BATCH-003" },
        { id: "ISS-02", title: "Packaging material delay", detail: "Secondary packaging materials arriving 2 days later. Timeline still on track.", level: "Low" as const, at: iso(-29), resolved: false, ref: "BATCH-003" },
      ],
      defectRate: 0.8, sampleId: "SMP-2026-0175",
    },
    {
      id: "ORD-2026-0045", name: "Plant Protein Powder", img: IMG.plantProtein, tags: ["Food & Beverages", "Powder"], desc: "Pea and brown rice protein blend, unflavoured, 1 kg pouch.",
      mfrId: "pureform", qty: 30000, unitFormat: "Pouch (1 kg)", createdAt: iso(-40), briefAt: iso(-40), sampleAt: iso(-25), productionAt: iso(3), targetDelivery: iso(45), incoterms: "EXW Pune", destination: "Bengaluru, India", confirmed: false,
      batches: [10000, 10000, 10000].map((p, k) => ({ id: `BATCH-0${k + 1}1`, planned: p, completed: 0, status: "Pending" as const, start: iso(3 + k * 7), end: iso(9 + k * 7) })),
      updates: [{ at: iso(-2), text: "Production plan shared; waiting for your confirmation to start." }], evidence: [], issues: [], defectRate: 0,
    },
    {
      id: "ORD-2026-0048", name: "Retinol Face Cream", img: IMG.retinol, tags: ["Skincare", "Cream"], desc: "Night retinol cream, 50 g jar.", mfrId: "mahafresh", qty: 20000, unitFormat: "Jar (50 g)",
      createdAt: iso(-60), briefAt: iso(-60), sampleAt: iso(-45), productionAt: iso(-20), targetDelivery: iso(12), incoterms: "FOB Chennai", destination: "Chennai, India", confirmed: true,
      batches: [10000, 10000].map((p, k) => ({ id: `BATCH-1${k + 1}0`, planned: p, completed: k === 0 ? 10000 : 6000, status: (k === 0 ? "Completed" : "In Progress") as "Completed" | "In Progress", start: iso(-20 + k * 8), end: iso(-13 + k * 8) })),
      updates: [{ at: iso(-5), text: "Second batch 60% filled." }], evidence: [], issues: [], defectRate: 1.1,
    },
    {
      id: "ORD-2026-0051", name: "Vitamin D3 Gummies", img: IMG.vitd3, tags: ["Supplements", "Gummies"], desc: "Vitamin D3 1000 IU gummies, 60 count bottle.", mfrId: "mahafresh", qty: 20000, unitFormat: "Bottle (60)",
      createdAt: iso(-30), briefAt: iso(-30), sampleAt: iso(-18), productionAt: iso(-6), targetDelivery: iso(30), incoterms: "FOB Chennai", destination: "Delhi, India", confirmed: true,
      batches: [10000, 10000].map((p, k) => ({ id: `BATCH-2${k + 1}0`, planned: p, completed: k === 0 ? 4000 : 0, status: (k === 0 ? "In Progress" : "Pending") as "In Progress" | "Pending", start: iso(-6 + k * 8), end: iso(1 + k * 8) })),
      updates: [{ at: iso(-6), text: "Production started." }], evidence: [], issues: [], defectRate: 0.5,
    },
    pastOrder(now, "ORD-2026-0039", "Fish Oil Softgels", IMG.omega3, "nutralab", 40000, 135, ["Supplements", "Softgels"]),
    pastOrder(now, "ORD-2026-0036", "Vitamin C Tablets", IMG.vitcTablets, "vitagen", 30000, 160, ["Supplements", "Tablets"]),
    pastOrder(now, "ORD-2026-0033", "Collagen Sachets", IMG.sachets, "pureform", 30000, 112, ["Supplements", "Sachets"]),
    pastOrder(now, "ORD-2026-0030", "Omega 3 Softgels", IMG.omega3, "nutralab", 20000, 178, ["Supplements", "Softgels"]),
  ];
}

/** Finished orders from earlier months: history for Reports and the orders the payment plans refer to. */
function pastOrder(now: number, id: string, name: string, img: string, mfrId: string, qty: number, startDaysAgo: number, tags: string[]) {
  const iso = (d: number) => new Date(now + d * D).toISOString();
  const n = Math.ceil(qty / 10000);
  return {
    id, name, img, tags, desc: `${name}, private label.`, mfrId, qty, unitFormat: tags[1] ?? "Units",
    createdAt: iso(-startDaysAgo - 30), briefAt: iso(-startDaysAgo - 30), sampleAt: iso(-startDaysAgo - 14), productionAt: iso(-startDaysAgo), targetDelivery: iso(-startDaysAgo + n * 8 + 12),
    incoterms: "FOB Factory", destination: "Mumbai, India", confirmed: true,
    batches: Array.from({ length: n }, (_, k) => ({ id: `${id.slice(-4)}-B${k + 1}`, planned: 10000, completed: 10000, status: "Completed" as const, start: iso(-startDaysAgo + k * 8), end: iso(-startDaysAgo + k * 8 + 6) })),
    updates: [{ at: iso(-startDaysAgo + n * 8 + 12), text: "Order delivered and closed." }], evidence: [], issues: [], defectRate: 0.6,
  };
}

function qb(now: number, p: Partial<QualityBatch> & Pick<QualityBatch, "id" | "sampleRef" | "name" | "img" | "mfrId" | "status">, done: number, hoursAgo: number): QualityBatch {
  const labels = ["Sample received & logged", "Physical appearance check", "Active content (Assay)", "Microbial testing", "Heavy metal testing", "Stability check", "COA reviewed"];
  const tests = ["Identity Test (HPTLC)", "Assay (Withanolides)", "Heavy Metals (Pb, As, Cd, Hg)", "Microbial Limits", "Pesticide Residue", "Disintegration Test", "Uniformity of Weight"];
  return {
    category: "Supplements", size: 50000, mfgDate: new Date(now - 6 * D).toISOString(), market: "India + Global", release: new Date(now + 11 * D).toISOString(),
    updatedAt: new Date(now - hoursAgo * H).toISOString(),
    checklist: labels.map((label, k) => ({ label, status: (k < done ? "Completed" : k === done ? "In Progress" : "Pending") as QualityBatch["checklist"][number]["status"] })),
    tests: tests.map((name, k) => ({ name, status: (p.status === "Passed" ? "Pass" : k === 3 ? "In Progress" : k === 4 ? "Pending" : "Pass") as QualityBatch["tests"][number]["status"] })),
    notes: [],
    ...p,
  };
}

function buildQuality(now: number): QualityBatch[] {
  const b3 = qb(now, { id: "BATCH-003", sampleRef: "SMP-2026-0187", name: "Ashwagandha Capsules", img: IMG.ashwagandha, mfrId: "nutralab", status: "In Testing", orderId: "ORD-2026-0042" }, 4, 2);
  b3.checklist = b3.checklist.map((c, k) => ({ ...c, status: k === 3 ? "In Progress" : k === 4 ? "Completed" : k < 3 ? "Completed" : "Pending" }));
  b3.notes = [{ at: new Date(now - 5 * H).toISOString(), who: "Rohit Mehta", text: "Initial test results are within acceptable limits. Awaiting microbial and stability test reports." }];
  return [
    b3,
    qb(now, { id: "BATCH-002", sampleRef: "SMP-2026-0186", name: "Collagen Peptides Powder", img: IMG.collagenPowder, mfrId: "pureform", status: "Passed" }, 7, 26),
    qb(now, { id: "BATCH-001", sampleRef: "SMP-2026-0185", name: "Vitamin D3 Gummies", img: IMG.vitd3, mfrId: "mahafresh", status: "Passed" }, 7, 74),
    qb(now, { id: "BATCH-005", sampleRef: "SMP-2026-0184", name: "Retinol Face Cream", img: IMG.retinol, mfrId: "pureform", status: "Issues Found" }, 4, 98),
    qb(now, { id: "BATCH-004", sampleRef: "SMP-2026-0183", name: "Plant Protein Powder", img: IMG.plantProtein, mfrId: "nutralab", status: "Passed" }, 7, 146),
  ];
}

type ShipSeed = [id: string, name: string, img: string, cat: string, qty: number, carrier: Shipment["carrier"], dest: string, etaDays: number, status: ShipStatus, step: number, updHours: number, note: string];
const SHIPS: ShipSeed[] = [
  ["SH-2026-0068", "Daily Multivitamin Capsules", IMG.multivitamin, "Supplements", 10000, "BlueDart Freight", "Mumbai, India", 6, "In Transit", 2, 2, ""],
  ["SH-2026-0072", "Collagen Peptides Powder", IMG.collagenPowder, "Supplements", 5000, "DHL", "Bengaluru, India", 10, "In Transit", 2, 26, ""],
  ["SH-2026-0075", "Vitamin D3 Gummies", IMG.vitd3, "Supplements", 20000, "Delhivery", "Delhi, India", -2, "Delivered", 4, 98, "Delivered"],
  ["SH-2026-0077", "Retinol Face Cream", IMG.retinol, "Skincare", 8000, "FedEx", "Chennai, India", 8, "Delayed", 2, 50, "Weather delay"],
  ["SH-2026-0078", "Hair Growth Serum", IMG.pump, "Personal Care", 12000, "BlueDart Freight", "Hyderabad, India", 13, "Pending", 0, 74, "Labeling"],
  ["SH-2026-0079", "Protein Bar (Chocolate)", IMG.proteinBar, "Food & Beverages", 15000, "Delhivery", "Pune, India", 11, "In Transit", 2, 74, "Departed hub"],
  ["SH-2026-0080", "Omega 3 Softgels", IMG.omega3, "Supplements", 8000, "DHL", "Kolkata, India", 7, "Pending", 0, 98, "Awaiting pickup"],
  ["SH-2026-0081", "Collagen Sachets", IMG.sachets, "Supplements", 25000, "FedEx", "Ahmedabad, India", 16, "Pending", 0, 122, "Ready for dispatch"],
  ["SH-2026-0082", "Greens Superfood", IMG.greens, "Supplements", 5000, "BlueDart Freight", "Jaipur, India", 9, "In Transit", 2, 2, "Arrived at hub"],
  ["SH-2026-0083", "Vitamin C Tablets", IMG.vitcTablets, "Supplements", 10000, "Delhivery", "Lucknow, India", 12, "In Transit", 2, 26, "In transit"],
  ["SH-2026-0084", "Immunity Gummies", IMG.immunity, "Supplements", 6000, "DHL", "Surat, India", 5, "In Transit", 3, 8, "Out for delivery"],
  ["SH-2026-0085", "Plant Protein Powder", IMG.plantProtein, "Food & Beverages", 9000, "BlueDart Freight", "Nagpur, India", 4, "In Transit", 2, 30, "In transit"],
  ["SH-2026-0086", "Ashwagandha Capsules", IMG.ashwagandha, "Supplements", 7000, "Delhivery", "Indore, India", 6, "In Transit", 2, 40, "Departed hub"],
  ["SH-2026-0087", "Vitamin C Gummies", IMG.vitcGummies, "Supplements", 15000, "FedEx", "Kochi, India", 3, "Delayed", 2, 20, "Hub congestion"],
  ["SH-2026-0088", "Fish Oil Softgels", IMG.omega3, "Supplements", 10000, "DHL", "Mumbai, India", -5, "Delivered", 4, 140, "Delivered"],
  ["SH-2026-0089", "Argan Hair Oil", IMG.hairSerum, "Personal Care", 4000, "BlueDart Freight", "Goa, India", -1, "Delivered", 4, 30, "Delivered"],
  ["SH-2026-0090", "Magnesium Tablets", IMG.vitcTablets, "Supplements", 6000, "Delhivery", "Bhopal, India", 18, "Pending", 0, 12, "Packing"],
  ["SH-2026-0091", "Electrolyte Sachets", IMG.sachets, "Food & Beverages", 12000, "DHL", "Chandigarh, India", 9, "In Transit", 1, 6, "Dispatched"],
];

function buildShipments(now: number): Shipment[] {
  return SHIPS.map(([id, name, img, category, qty, carrier, destination, eta, status, step, upd, note]) => {
    const updatedAt = now - upd * H;
    const stepDates = [0, 1, 2, 3, 4].map((k) => (k <= step && status !== "Pending" ? new Date(updatedAt - (step - k) * D).toISOString() : k === 0 && status === "Pending" ? null : null));
    return {
      id, name, img, category, qty, carrier, destination, eta: new Date(now + eta * D).toISOString(), status, step, updatedAt: new Date(updatedAt).toISOString(), note,
      orderId: id === "SH-2026-0068" ? "ORD-2026-0042" : undefined,
      value: qty * 125, incoterms: "FOB Gujarat", packages: `${Math.ceil(qty / 850)} cartons`, stepDates,
      events: status === "Pending" ? [{ at: new Date(updatedAt).toISOString(), text: `Shipment created — ${note.toLowerCase() || "awaiting dispatch"}.`, tone: "amber" as const }] : [
        { at: new Date(updatedAt).toISOString(), text: status === "Delivered" ? `Delivered at ${destination.split(",")[0]}.` : `Shipment arrived at ${destination.split(",")[0]} sorting facility.`, tone: "green" as const },
        { at: new Date(updatedAt - 18 * H).toISOString(), text: "Departed from Ahmedabad hub.", tone: "green" as const },
        { at: new Date(updatedAt - 23 * H).toISOString(), text: "Shipment picked up from factory (Gujarat, India).", tone: "amber" as const },
        { at: new Date(updatedAt - 41 * H).toISOString(), text: "Shipment packed and ready for dispatch.", tone: "green" as const },
      ],
      documents: ["Commercial_Invoice.pdf", "Packing_List.pdf", "E-way_Bill.pdf"],
      carrierContact: { name: "Amit Verma", role: "Logistics Manager", img: PEOPLE.amit.img },
    };
  });
}

function plan(now: number, orderId: string, name: string, img: string, mfrId: string, stage: string, rows: [string, string, number, number, Milestone["status"]][]): PaymentPlan {
  return {
    orderId, name, img, mfrId, stage,
    milestones: rows.map(([invoice, n, dueDays, amount, status]) => ({ invoice, name: n, due: new Date(now + dueDays * D).toISOString(), amount, status, paidAt: status === "Paid" ? new Date(now + dueDays * D).toISOString() : undefined })),
    notes: [{ at: new Date(now - 45 * D).toISOString(), who: "Rohit Mehta", text: "Sample approval payment received. Thank you." }],
    documents: [`Proforma_Invoice_${orderId}.pdf`, `Purchase_Order_${orderId}.pdf`, "Payment_Terms.pdf"],
  };
}

function buildPayments(now: number): PaymentPlan[] {
  return [
    plan(now, "ORD-2026-0042", "Daily Multivitamin Capsules", IMG.multivitamin, "nutralab", "In Production", [
      ["INV-2026-0987", "30% Advance", -90, 300000, "Paid"], ["INV-2026-1001", "Sample Approval", -74, 200000, "Paid"], ["INV-2026-1023", "Production Start", 4, 450000, "Due Soon"],
      ["INV-2026-1045", "Dispatch", 32, 300000, "Scheduled"], ["INV-2026-1067", "Final Settlement", 47, 250000, "Scheduled"],
    ]),
    plan(now, "ORD-2026-0045", "Plant Protein Powder", IMG.plantProtein, "pureform", "Awaiting Start", [
      ["INV-2026-1010", "30% Advance", -40, 450000, "Paid"], ["INV-2026-1015", "Sample Approval", -6, 600000, "Overdue"], ["INV-2026-1030", "Production Start", 13, 600000, "Scheduled"],
      ["INV-2026-1050", "Final Settlement", 53, 450000, "Scheduled"],
    ]),
    plan(now, "ORD-2026-0048", "Retinol Face Cream", IMG.retinol, "mahafresh", "In Production", [
      ["INV-2026-1020", "30% Advance", -60, 360000, "Paid"], ["INV-2026-1032", "Sample Approval", -45, 240000, "Paid"], ["INV-2026-1040", "Production Start", -20, 480000, "Paid"],
      ["INV-2026-1055", "Dispatch", 9, 360000, "Due Soon"], ["INV-2026-1070", "Final Settlement", 26, 240000, "Scheduled"],
    ]),
    plan(now, "ORD-2026-0051", "Vitamin D3 Gummies", IMG.vitd3, "mahafresh", "In Production", [
      ["INV-2026-1080", "30% Advance", -30, 180000, "Paid"], ["INV-2026-1085", "Production Start", -3, 240000, "Overdue"], ["INV-2026-1090", "Final Settlement", 35, 180000, "Scheduled"],
    ]),
    plan(now, "ORD-2026-0036", "Vitamin C Tablets", IMG.vitcTablets, "vitagen", "Delivered", [
      ["INV-2026-0901", "30% Advance", -120, 210000, "Paid"], ["INV-2026-0930", "Dispatch", -70, 280000, "Paid"], ["INV-2026-0950", "Final Settlement", 10, 210000, "Due Soon"],
    ]),
    plan(now, "ORD-2026-0039", "Fish Oil Softgels", IMG.omega3, "nutralab", "Delivered", [
      ["INV-2026-0911", "30% Advance", -110, 240000, "Paid"], ["INV-2026-0940", "Final Settlement", -20, 560000, "Paid"],
    ]),
  ];
}

const STAGE_FOR: Record<EnquiryStage, ProductStage> = {
  Draft: "Draft", "In Discussion": "In Development", "Quote Received": "In Development", "Samples Requested": "In Development", "In Production": "In Production", Closed: "Active",
};

function buildProducts(now: number, enquiries: Enquiry[]): Product[] {
  const picks: [string, ProductStage, string][] = [
    ["Daily Multivitamin Capsules", "Active", "nutralab"], ["Ashwagandha Capsules", "In Development", "nutralab"], ["Retinol Face Cream", "In Production", "pureform"],
    ["Plant Protein Powder", "Active", "mahafresh"], ["Omega 3 Softgels", "Approved", "nutralab"], ["Immunity Gummies", "Draft", "mahafresh"],
    ["Hair Growth Serum", "In Development", "pureform"], ["Protein Bar (Chocolate)", "Active", "mahafresh"], ["Collagen Sachets", "In Production", "nutralab"],
  ];
  const named = picks.map(([name, stage, mfrId], i) => {
    const e = enquiries.find((x) => x.name === name)!;
    return { name, stage, mfrId, img: e.img, category: e.category, moq: e.moq, h: 2 + i * 24 };
  });
  const rest = enquiries.filter((e) => !picks.some(([n]) => n === e.name)).slice(0, 9).map((e, i) => ({
    name: e.name, stage: (i === 7 || i === 8 ? "Archived" : STAGE_FOR[e.stage]) as ProductStage, mfrId: MFR_IDS[i % MFR_IDS.length], img: e.img, category: e.category, moq: e.moq, h: 240 + i * 30,
  }));
  return [...named, ...rest].map((p, i) => ({
    id: `PROD-${String(i + 1).padStart(3, "0")}`,
    name: p.name, img: p.img, category: p.category, tags: [p.category, p.name.split(" ").slice(-1)[0]], mfrId: p.mfrId, stage: p.stage, moq: p.moq,
    updatedAt: new Date(now - p.h * H).toISOString(),
    brief: i === 0
      ? "A premium daily multivitamin formulated with essential vitamins, minerals and plant-based extracts to support overall wellness and daily nutritional needs."
      : `${p.name} made to our brand standard: clean label, consistent quality and export-ready packaging.`,
    market: ["Adults 25–50", "Health-conscious consumers", "Global markets"],
    certs: ["GMP Certified", "FSSAI Compliant", "ISO 9001", "Third-party Tested"],
    packaging: [
      { name: "Bottle (60)", detail: "60 capsules · PET bottle", img: p.img, primary: true },
      { name: "Bottle (120)", detail: "120 capsules · PET bottle", img: IMG.omega3 },
      { name: "Pouch (30)", detail: "30 capsules · Doypack pouch", img: IMG.sachets },
    ],
  }));
}

export function consoleSeed(now = Date.now()): ConsoleState {
  const enquiries = buildEnquiries(now);
  const ago = (h: number) => new Date(now - h * H).toISOString();
  return {
    v: CONSOLE_VERSION,
    user: { name: "Priya Sharma", role: "Operations Lead", img: "/console/av-priya.jpg", email: "priya@scouthru.demo" },
    workspace: "Scouthru Demo",
    manufacturers: MANUFACTURERS,
    enquiries,
    samples: buildSamples(now),
    orders: buildOrders(now),
    quality: buildQuality(now),
    issues: [
      { id: "QI-1", title: "High moisture content detected", detail: "Moisture at 6.8% vs 5% limit", level: "High", at: ago(50), resolved: false, ref: "BATCH-005 – Retinol Face Cream" },
      { id: "QI-2", title: "Microbial count above limit", detail: "TPC above spec on retest sample", level: "Medium", at: ago(74), resolved: false, ref: "BATCH-003 – Ashwagandha Capsules" },
      { id: "QI-3", title: "Label mismatch (ingredient)", detail: "Ingredient order differs from approved artwork", level: "Low", at: ago(122), resolved: false, ref: "BATCH-007 – Omega 3 Softgels" },
    ],
    compliance: [
      { name: "GMP", status: "Valid" }, { name: "FSSAI", status: "Valid" }, { name: "ISO 22000", status: "Valid" },
      { name: "COA", status: "Valid" }, { name: "Stability Data", status: "Valid" }, { name: "Microbial Test", status: "Valid" },
    ],
    shipments: buildShipments(now),
    payments: buildPayments(now),
    products: buildProducts(now, enquiries),
    activity: [
      { id: "a1", at: ago(2), who: "Priya Sharma", img: PEOPLE.priya.img, text: "Approved sample SMP-2026-0183 for Protein Bar (Chocolate)", tag: "Sample", href: "/console/samples?id=SMP-2026-0183" },
      { id: "a2", at: ago(5), who: "Rohit Mehta", img: PEOPLE.rohit.img, text: "Updated production progress to 64% for ORD-2026-0042", tag: "Production", href: "/console/production?id=ORD-2026-0042" },
      { id: "a3", at: ago(26), who: "New shipment dispatched", img: "/console/act-shipment.jpg", text: "SH-2026-0068 to Mumbai, India", tag: "Shipment", href: "/console/shipments?id=SH-2026-0068" },
      { id: "a4", at: ago(28), who: "Quality issue reported", text: "Batch 003 – Packaging material delay", tag: "Quality", href: "/console/quality?id=BATCH-003" },
      { id: "a5", at: ago(50), who: "Anjali Desai", img: PEOPLE.anjali.img, text: "Added comment on sample SMP-2026-0175", tag: "Sample", href: "/console/samples?id=SMP-2026-0175" },
      { id: "a6", at: ago(74), who: "New enquiry received", text: "from PureForm Labs for Collagen Peptides", tag: "Enquiry", href: "/console/enquiries?id=ENQ-2026-002" },
    ],
    exports: [
      { file: "Operational_Report_Sep2026.pdf", type: "Operational", at: ago(26 * 24), by: "Priya Sharma" },
      { file: "Manufacturer_Performance.pdf", type: "Manufacturer", at: ago(28 * 24), by: "Rohit Mehta" },
      { file: "Payment_Summary_Aug2026.pdf", type: "Payment", at: ago(33 * 24), by: "Priya Sharma" },
      { file: "Quality_Report_Aug2026.pdf", type: "Quality", at: ago(36 * 24), by: "Anjali Desai" },
      { file: "Shipment_Performance_Jul2026.pdf", type: "Shipment", at: ago(41 * 24), by: "Rohit Mehta" },
    ],
    messages: [],
    readNotifications: [],
    ...networkSeed(now),
  };
}
