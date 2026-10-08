import type { Product as CatalogProduct, Unit } from "@/lib/types";
import type { ConsoleState, Manufacturer } from "./types";
import { createEnquiry, createOrderFromSample, log, requestSample, sendMessage, setSampleStatus } from "./actions";

/**
 * The marketplace's catalog (ready products, anonymous verified units) lives in
 * the marketplace seed; every action a brand takes there lands in the console:
 * the unit becomes a named manufacturer, and enquiries, samples and Assured
 * orders show up on the Enquiries, Samples, Production and Payments screens.
 */

const FACTORY_PHOTOS = ["/console/f-vitagen-sq.jpg", "/console/f-greenleaf-sq.jpg", "/console/f-nutripro-sq.jpg", "/console/f-wellplus-sq.jpg", "/console/f-herbaveda-sq.jpg"];

const CATEGORY_NAME: Record<string, string> = {
  supplements: "Supplements", skincare: "Skincare", snacks: "Food & Beverages", beverages: "Food & Beverages", personal: "Personal Care", packaging: "Packaging",
};

export const unitMfrId = (code: string) => `unit-${code.toLowerCase()}`;
export const catalogImg = (p: CatalogProduct) => `/products/${p.id}.jpg`;

/** Connecting with a unit reveals it: it joins the console's manufacturer list. */
export function ensureMfrFromUnit(d: ConsoleState, u: Unit): string {
  const id = unitMfrId(u.code);
  const existing = d.manufacturers.find((m) => m.id === id);
  if (existing) { existing.contacted = true; return id; }
  const n = d.manufacturers.filter((m) => m.id.startsWith("unit-")).length;
  const m: Manufacturer = {
    id, name: u.name, short: u.name.split(" ")[0], city: u.city, state: u.state, img: FACTORY_PHOTOS[n % FACTORY_PHOTOS.length],
    rating: 4.5, reviews: 0, certs: u.licences, capabilities: u.tags, moq: u.moq, responseDays: [1, 2],
    about: `${u.name} (Unit ${u.code}) is a Scouthru-verified ${u.kind.toLowerCase()} unit in ${u.city}, ${u.state}. Lines: ${u.lines}.`,
    years: 6, brands: 40, unitsPerMonth: `${Math.round(u.freeCap / 1000)}K free`, sqft: "—", categories: u.formats.length ? u.formats : u.category,
    onTime: 95, qualityIssues: 1, avgResponse: 1.5, shortlisted: true, contacted: true,
    contacts: [{ name: "Scouthru sourcing desk", role: "Your contact for this unit", img: "/console/av-rohit.jpg", email: "sourcing@scouthru.demo", phone: "+91 40 4000 1234" }],
  };
  d.manufacturers.push(m);
  log(d, { text: `Connected with ${u.name} (Unit ${u.code}) from the marketplace`, tag: "Manufacturer", href: `/console/manufacturers?id=${id}` });
  return id;
}

function enquiryFor(d: ConsoleState, x: { name: string; category: string; img: string; qty: number; brief: string }, mfrId?: string) {
  const id = createEnquiry(d, { name: x.name, category: x.category, moq: x.qty, launch: "Next quarter", price: "As quoted", brief: x.brief, requirements: ["White label", "Verified unit"], img: x.img });
  const e = d.enquiries.find((q) => q.id === id)!;
  if (mfrId) {
    e.responses = [{ mfrId, status: "Awaiting Reply", at: new Date().toISOString(), note: "Enquiry received from the marketplace." }];
    e.mfrCount = 1;
    e.activity[0].text = `Sent from the marketplace to ${d.manufacturers.find((m) => m.id === mfrId)?.name}`;
  }
  return id;
}

/** Product page / manufacturer search → "Send enquiry". */
export function marketEnquiry(d: ConsoleState, x: { name: string; categoryId?: string; img: string; qty: number; message: string; unit?: Unit }) {
  const mfrId = x.unit ? ensureMfrFromUnit(d, x.unit) : undefined;
  const id = enquiryFor(d, { name: x.name, category: CATEGORY_NAME[x.categoryId ?? ""] ?? "Supplements", img: x.img, qty: x.qty, brief: x.message }, mfrId);
  if (mfrId) sendMessage(d, d.manufacturers.find((m) => m.id === mfrId)!.name, `Enquiry: ${x.name}`, x.message, `/console/enquiries?id=${id}`, "Enquiry");
  return id;
}

/** "Post a requirement": an open enquiry matched to verified manufacturers. */
export function postMarketRequirement(d: ConsoleState, x: { product: string; qty: number; details: string; categoryId?: string }) {
  return enquiryFor(d, { name: x.product, category: CATEGORY_NAME[x.categoryId ?? ""] ?? "Supplements", img: "/console/p-multivitamin.jpg", qty: x.qty, brief: x.details || `Custom requirement for ${x.product}.` });
}

/** Product page → "Request sample": the unit is revealed and the sample shows in Samples. */
export function marketSample(d: ConsoleState, p: CatalogProduct, u: Unit, options: string) {
  const mfrId = ensureMfrFromUnit(d, u);
  const enq = enquiryFor(d, { name: p.name, category: CATEGORY_NAME[p.category] ?? p.categoryLabel, img: catalogImg(p), qty: p.moq, brief: `${p.desc} Options: ${options}.` }, mfrId);
  const smp = requestSample(d, enq, mfrId, 3);
  const s = d.samples.find((x) => x.id === smp)!;
  s.desc = p.desc;
  s.tags = [p.categoryLabel, p.format];
  s.specs = p.specs;
  return { enquiryId: enq, sampleId: smp, mfrId };
}

/**
 * "Order with Scouthru Assured": the listing's golden sample counts as approved,
 * so this goes straight to a production order with its payment plan, and the
 * product joins the brand's catalogue.
 */
export function assuredOrder(d: ConsoleState, p: CatalogProduct, u: Unit, qty: number, unitPrice: number, options: string, destination: string) {
  const { sampleId, mfrId } = marketSample(d, p, u, options);
  setSampleStatus(d, sampleId, "Approved", "Approved golden sample from the Scouthru Assured listing.");
  const orderId = createOrderFromSample(d, sampleId, qty, unitPrice, destination)!;
  if (!d.products.some((x) => x.name === p.name)) {
    const n = d.products.length + 1;
    d.products.unshift({
      id: `PROD-${String(n).padStart(3, "0")}`, name: p.name, img: catalogImg(p), category: CATEGORY_NAME[p.category] ?? p.categoryLabel, tags: [p.categoryLabel, p.format],
      mfrId, stage: "In Production", moq: p.moq, updatedAt: new Date().toISOString(), brief: p.desc, market: ["Your customers"], certs: u.licences,
      packaging: [{ name: p.pack, detail: options, img: catalogImg(p), primary: true }],
    });
  }
  const o = d.orders.find((x) => x.id === orderId)!;
  o.tags = ["Scouthru Assured", p.categoryLabel];
  o.desc = `${p.desc} ${options}.`;
  return orderId;
}

/** Manufacturer search → "Scouthru, do it for me": a request to the sourcing desk. */
export function assistedSourcing(d: ConsoleState, u: Unit) {
  sendMessage(d, "Scouthru sourcing desk", `Run it for me · Unit ${u.code}`, `Please shortlist Unit ${u.code} and two alternates, get frozen quotes and run the order under Scouthru Assured.`, "/console/manufacturers", "Manufacturer");
}
