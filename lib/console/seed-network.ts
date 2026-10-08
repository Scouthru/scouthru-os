import type { ConsoleState } from "./types";

/**
 * Starting data for the manufacturer, supplier and distributor portals. The
 * manufacturer portal is NutraLab (already the brand's main partner), the
 * supplier sells packaging to NutraLab, and the distributor receives the
 * brand's Mumbai shipments.
 */

const H = 3600e3;
const D = 24 * H;

type NetworkSeed = Pick<ConsoleState, "people" | "makerId" | "supplierId" | "distributor" | "leads" | "capacity" | "suppliers" | "purchaseOrders" | "supplierStock" | "distStock" | "retailOrders" | "routes" | "grns" | "schemes">;

export function networkSeed(now: number): NetworkSeed {
  const iso = (days: number) => new Date(now + days * D).toISOString();
  const ago = (hours: number) => new Date(now - hours * H).toISOString();

  return {
    people: {
      brand: { name: "Priya Sharma", role: "Operations Lead", img: "/console/av-priya.jpg", email: "priya@scouthru.demo" },
      maker: { name: "Rohit Mehta", role: "Account Manager · NutraLab", img: "/console/av-rohit.jpg", email: "rohit.mehta@nutralab.example" },
      supplier: { name: "Suresh Iyer", role: "Sales Head · PackRight", email: "suresh@packright.example" },
      distributor: { name: "Kavya Nair", role: "Operations · Metro Health", email: "kavya@metrohealth.example" },
    },
    makerId: "nutralab",
    supplierId: "packright",
    distributor: { name: "Metro Health Distributors", city: "Mumbai", area: "Mumbai & Thane" },

    leads: [
      { id: "LD-101", product: "Whey protein capsules", buyer: "FitKart Retail", source: "IndiaMART", qty: 20000, at: ago(5), status: "New", note: "Wants 60-count bottles, private label." },
      { id: "LD-102", product: "Biotin gummies", buyer: "Glowkind", source: "WhatsApp", qty: 15000, at: ago(28), status: "Quoted", note: "Strawberry flavour, sugar-free.", quote: 7.8 },
      { id: "LD-103", product: "Vitamin D3 drops", buyer: "Call from Pune pharmacy chain", source: "Phone", qty: 5000, at: ago(52), status: "New", note: "Needs liquid line; check capacity." },
      { id: "LD-104", product: "Multivitamin tablets", buyer: "Herbline Exports", source: "Email", qty: 40000, at: ago(120), status: "Won", note: "Export order, ISO certificate shared.", quote: 4.9 },
      { id: "LD-105", product: "Protein powder sachets", buyer: "GymFuel", source: "IndiaMART", qty: 10000, at: ago(200), status: "Lost", note: "Went with a cheaper quote.", quote: 11.5 },
    ],
    capacity: [
      { line: "Capsule line", perMonth: 1200000, unit: "capsules", formats: ["Capsules"] },
      { line: "Tablet line", perMonth: 900000, unit: "tablets", formats: ["Tablets"] },
      { line: "Gummy line", perMonth: 300000, unit: "gummies", formats: ["Gummies"] },
      { line: "Powder & sachet line", perMonth: 80000, unit: "units", formats: ["Powders", "Sachets"] },
    ],

    suppliers: [
      { id: "packright", name: "PackRight Packaging", city: "Ahmedabad", state: "Gujarat", kind: "Packaging", rating: 4.6, categories: ["PET bottles", "Caps", "Labels", "Cartons"] },
      { id: "herbex", name: "Herbex Ingredients", city: "Bengaluru", state: "Karnataka", kind: "Ingredients", rating: 4.5, categories: ["Herbal extracts", "Vitamin premixes", "Capsule shells"] },
    ],
    purchaseOrders: [
      {
        id: "PO-2026-118", supplierId: "packright", mfrId: "nutralab", orderId: "ORD-2026-0042", title: "Bottles and caps for Daily Multivitamin",
        lines: [{ sku: "PET-150", name: "PET bottle 150 ml, amber", qty: 50000, unit: "pcs" }, { sku: "CAP-38", name: "CRC cap 38 mm", qty: 50000, unit: "pcs" }],
        needBy: iso(9), status: "RFQ", source: "Scouthru", createdAt: ago(6), updatedAt: ago(6), events: [{ at: ago(6), text: "RFQ sent by NutraLab Manufacturing" }],
      },
      {
        id: "PO-2026-115", supplierId: "packright", mfrId: "nutralab", orderId: "ORD-2026-0042", title: "Printed labels, batch 4–5",
        lines: [{ sku: "LBL-60", name: "Wrap label 60×120 mm, printed", qty: 20000, unit: "pcs" }],
        needBy: iso(5), status: "Quoted", source: "Scouthru", quote: { total: 36000, leadDays: 4, note: "Art proof approved; 4 working days.", at: ago(20) },
        createdAt: ago(48), updatedAt: ago(20), events: [{ at: ago(48), text: "RFQ sent by NutraLab Manufacturing" }, { at: ago(20), text: "PackRight quoted ₹36,000 · 4 days" }],
      },
      {
        id: "PO-2026-109", supplierId: "packright", mfrId: "nutralab", orderId: "ORD-2026-0042", title: "Shipper cartons",
        lines: [{ sku: "CTN-5P", name: "5-ply shipper carton, 24 bottles", qty: 2100, unit: "pcs" }],
        needBy: iso(2), status: "Confirmed", source: "Scouthru", quote: { total: 52500, leadDays: 5, note: "", at: ago(120) },
        createdAt: ago(150), updatedAt: ago(96), events: [{ at: ago(150), text: "RFQ sent by NutraLab Manufacturing" }, { at: ago(120), text: "PackRight quoted ₹52,500 · 5 days" }, { at: ago(96), text: "NutraLab confirmed the order" }],
      },
      {
        id: "PO-2026-102", supplierId: "packright", mfrId: "nutralab", title: "Jars for Retinol cream run",
        lines: [{ sku: "JAR-50", name: "PP jar 50 g with lid", qty: 20000, unit: "pcs" }],
        needBy: iso(-3), status: "Dispatched", source: "Scouthru", vehicle: "GJ-01-KT-4410", quote: { total: 98000, leadDays: 7, note: "", at: ago(300) },
        createdAt: ago(340), updatedAt: ago(30), events: [{ at: ago(340), text: "RFQ sent" }, { at: ago(300), text: "Quoted ₹98,000" }, { at: ago(280), text: "Confirmed" }, { at: ago(30), text: "Dispatched on GJ-01-KT-4410" }],
      },
      {
        id: "PO-2026-094", supplierId: "packright", mfrId: "nutralab", title: "Bottles for Fish Oil run",
        lines: [{ sku: "PET-150", name: "PET bottle 150 ml, amber", qty: 40000, unit: "pcs" }],
        needBy: iso(-40), status: "Received", source: "Scouthru", quote: { total: 168000, leadDays: 6, note: "", at: ago(1200) },
        invoice: { no: "PR-INV-2291", amount: 168000, due: iso(-5) }, createdAt: ago(1300), updatedAt: ago(900), events: [{ at: ago(1300), text: "RFQ sent" }, { at: ago(900), text: "Received at NutraLab" }],
      },
      {
        id: "PO-2026-081", supplierId: "packright", mfrId: "nutralab", title: "Caps for Omega 3 run",
        lines: [{ sku: "CAP-38", name: "CRC cap 38 mm", qty: 20000, unit: "pcs" }],
        needBy: iso(-90), status: "Paid", source: "Scouthru", quote: { total: 44000, leadDays: 5, note: "", at: ago(2300) },
        invoice: { no: "PR-INV-2210", amount: 44000, due: iso(-70), paidAt: iso(-68), ref: "UTR 5521 0098 3321" }, createdAt: ago(2400), updatedAt: ago(1630), events: [{ at: ago(2400), text: "RFQ sent" }, { at: ago(1630), text: "Paid" }],
      },
      {
        id: "PO-2026-120", supplierId: "packright", mfrId: "pureform", title: "Dropper bottles 30 ml",
        lines: [{ sku: "DRP-30", name: "Amber dropper bottle 30 ml", qty: 12000, unit: "pcs" }],
        needBy: iso(12), status: "RFQ", source: "IndiaMART", createdAt: ago(3), updatedAt: ago(3), events: [{ at: ago(3), text: "Enquiry via IndiaMART" }],
      },
    ],
    supplierStock: [
      { sku: "PET-150", name: "PET bottle 150 ml, amber", spec: "28 g, 38 mm neck", unit: "pcs", onHand: 64000, reserved: 0, price: 2.4, moq: 5000, leadDays: 5 },
      { sku: "CAP-38", name: "CRC cap 38 mm", spec: "Child-resistant, white", unit: "pcs", onHand: 41000, reserved: 0, price: 0.9, moq: 5000, leadDays: 4 },
      { sku: "LBL-60", name: "Wrap label 60×120 mm, printed", spec: "BOPP, 4-colour", unit: "pcs", onHand: 0, reserved: 0, price: 1.8, moq: 5000, leadDays: 4 },
      { sku: "CTN-5P", name: "5-ply shipper carton, 24 bottles", spec: "Printed 1-colour", unit: "pcs", onHand: 2600, reserved: 2100, price: 25, moq: 500, leadDays: 5 },
      { sku: "JAR-50", name: "PP jar 50 g with lid", spec: "White, wadded lid", unit: "pcs", onHand: 8000, reserved: 0, price: 4.9, moq: 5000, leadDays: 7 },
      { sku: "DRP-30", name: "Amber dropper bottle 30 ml", spec: "Glass, with pipette", unit: "pcs", onHand: 15000, reserved: 0, price: 6.2, moq: 2000, leadDays: 6 },
      { sku: "PCH-250", name: "Stand-up pouch 250 g", spec: "Zip-lock, matte", unit: "pcs", onHand: 3200, reserved: 0, price: 3.1, moq: 3000, leadDays: 8 },
    ],

    distStock: [
      { sku: "DMV-60", product: "Daily Multivitamin Capsules 60s", brand: "Scouthru Demo", img: "/console/p-multivitamin.jpg", onHand: 1840, reorderAt: 600, batch: "B-002", expiry: iso(540), mrp: 599, price: 420 },
      { sku: "FOS-60", product: "Fish Oil Softgels 60s", brand: "Scouthru Demo", img: "/console/p-omega3.jpg", onHand: 420, reorderAt: 500, batch: "B-0039", expiry: iso(400), mrp: 749, price: 520 },
      { sku: "VCG-30", product: "Vitamin C Gummies 30s", brand: "Scouthru Demo", img: "/console/p-vitc-gummies.jpg", onHand: 960, reorderAt: 400, batch: "B-011", expiry: iso(300), mrp: 399, price: 270 },
      { sku: "VD3-60", product: "Vitamin D3 Gummies 60s", brand: "Scouthru Demo", img: "/console/p-vitd3-gummies.jpg", onHand: 130, reorderAt: 300, batch: "B-201", expiry: iso(360), mrp: 449, price: 310 },
      { sku: "CLS-15", product: "Collagen Sachets 15s", brand: "Scouthru Demo", img: "/console/p-collagen-sachets.jpg", onHand: 610, reorderAt: 250, batch: "B-0033", expiry: iso(200), mrp: 899, price: 640 },
    ],
    retailOrders: [
      { id: "RO-5521", retailer: "Wellness Mart, Andheri", area: "Andheri", lines: [{ sku: "DMV-60", qty: 48 }, { sku: "VCG-30", qty: 24 }], value: 26640, status: "New", payment: "Due", at: ago(3) },
      { id: "RO-5520", retailer: "Apollo Pharmacy, Powai", area: "Powai", lines: [{ sku: "FOS-60", qty: 36 }], value: 18720, status: "New", payment: "Due", at: ago(7) },
      { id: "RO-5518", retailer: "HealthFirst Chemists, Thane", area: "Thane", lines: [{ sku: "DMV-60", qty: 60 }, { sku: "CLS-15", qty: 20 }], value: 38000, status: "Packed", routeId: "R2", payment: "Due", at: ago(26) },
      { id: "RO-5515", retailer: "MedPlus, Bandra", area: "Bandra", lines: [{ sku: "VD3-60", qty: 24 }], value: 7440, status: "Out for Delivery", routeId: "R1", payment: "Due", at: ago(30) },
      { id: "RO-5509", retailer: "Noble Chemist, Dadar", area: "Dadar", lines: [{ sku: "DMV-60", qty: 36 }], value: 15120, status: "Delivered", routeId: "R1", payment: "Due", at: ago(80), deliveredAt: ago(60) },
      { id: "RO-5502", retailer: "Guardian Pharmacy, Vashi", area: "Vashi", lines: [{ sku: "VCG-30", qty: 48 }], value: 12960, status: "Delivered", routeId: "R3", payment: "Collected", at: ago(170), deliveredAt: ago(150), collected: { at: ago(140), mode: "UPI", amount: 12960, ref: "UPI 4410 9021" } },
      { id: "RO-5497", retailer: "Wellness Mart, Andheri", area: "Andheri", lines: [{ sku: "FOS-60", qty: 24 }], value: 12480, status: "Delivered", routeId: "R1", payment: "Due", at: ago(260), deliveredAt: ago(230) },
    ],
    routes: [
      { id: "R1", name: "Western line", day: "Mon · Thu", areas: ["Bandra", "Andheri", "Dadar"], van: "MH-02-EK-2231", driver: "Sanjay P." },
      { id: "R2", name: "Thane & Mulund", day: "Tue · Fri", areas: ["Thane", "Mulund", "Powai"], van: "MH-04-HN-7781", driver: "Imran K." },
      { id: "R3", name: "Navi Mumbai", day: "Wed · Sat", areas: ["Vashi", "Nerul", "Belapur"], van: "MH-43-BQ-1190", driver: "Deepak R." },
    ],
    grns: [
      { shipmentId: "SH-2026-0088", at: ago(130), lines: [{ sku: "FOS-60", product: "Fish Oil Softgels 60s", invoiced: 10000, received: 9980, damaged: 20 }], claim: "20 bottles crushed in two cartons; photos shared." },
    ],
    schemes: [
      { id: "SC-1", brand: "Scouthru Demo", title: "Buy 10 get 1 · Daily Multivitamin", detail: "On 60s packs for chemists, this month only.", validTill: iso(21), active: true },
      { id: "SC-2", brand: "Scouthru Demo", title: "Launch margin +4% · Vitamin D3 Gummies", detail: "Extra margin on first two orders per outlet.", validTill: iso(35), active: true },
      { id: "SC-3", brand: "Scouthru Demo", title: "Display rental · Collagen Sachets", detail: "₹500 per counter display per month.", validTill: iso(-2), active: false },
    ],
  };
}
