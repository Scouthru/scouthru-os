/**
 * Scouthru OS console data model. One brand workspace ("Scouthru Demo") running
 * products from enquiry to delivery. Every screen reads and writes this state.
 * Dates are ISO strings; money is in rupees.
 */

export type ID = string;

export type Manufacturer = {
  id: ID;
  name: string;
  short: string;
  city: string;
  state: string;
  img: string;
  rating: number;
  reviews: number;
  certs: string[];
  capabilities: string[];
  moq: number;
  responseDays: [number, number];
  about: string;
  years: number;
  brands: number;
  unitsPerMonth: string;
  sqft: string;
  categories: string[];
  onTime: number;
  qualityIssues: number;
  avgResponse: number;
  shortlisted: boolean;
  contacted: boolean;
  contacts: { name: string; role: string; img: string; email: string; phone: string }[];
};

export type EnquiryStage = "Draft" | "In Discussion" | "Quote Received" | "Samples Requested" | "In Production" | "Closed";

export type Response = { mfrId: ID; status: "Quote Received" | "Shared Proposal" | "Awaiting Reply" | "Declined"; at: string; note: string };
export type Quote = { mfrId: ID; unitPrice: number; moq: number; leadWeeks: number; validTill: string; shortlisted: boolean };
export type Step = { text: string; due: string; done: boolean };
export type Note = { at: string; who: string; text: string };

export type Enquiry = {
  id: ID;
  name: string;
  img: string;
  category: string;
  tags: string[];
  mfrCount: number;
  moq: number;
  stage: EnquiryStage;
  updatedAt: string;
  createdAt: string;
  launch: string;
  price: string;
  brief: string;
  requirements: string[];
  responses: Response[];
  quotes: Quote[];
  steps: Step[];
  activity: Note[];
  productId?: ID;
};

export type SampleStatus = "Draft" | "Submitted" | "In Review" | "Testing" | "Feedback" | "Changes Requested" | "Approved" | "Rejected";
export type Eval = { label: string; status: "Pass" | "Fail" | "Testing" | "Not Started"; note: string };

export type Sample = {
  id: ID;
  name: string;
  img: string;
  mfrId: ID;
  rev: number;
  qty: number;
  unit: string;
  requestedAt: string;
  leadTime: string;
  status: SampleStatus;
  tags: string[];
  desc: string;
  specs: [string, string][];
  evaluation: Eval[];
  comments: Note[];
  packaging: string[];
  attachments: string[];
  enquiryId?: ID;
  productId?: ID;
  orderId?: ID;
  history: { status: SampleStatus; at: string }[];
};

export type BatchStatus = "Pending" | "In Progress" | "Completed";
export type Batch = { id: ID; planned: number; completed: number; status: BatchStatus; start: string; end: string };
export type Issue = { id: ID; title: string; detail: string; level: "High" | "Medium" | "Low"; at: string; resolved: boolean; ref: string };

export type Order = {
  id: ID;
  name: string;
  img: string;
  tags: string[];
  desc: string;
  mfrId: ID;
  qty: number;
  unitFormat: string;
  createdAt: string;
  briefAt: string;
  sampleAt: string;
  productionAt: string;
  targetDelivery: string;
  incoterms: string;
  destination: string;
  confirmed: boolean;
  batches: Batch[];
  updates: { at: string; text: string; img?: string }[];
  evidence: { img: string; label: string; batch: string }[];
  issues: Issue[];
  defectRate: number;
  productId?: ID;
  sampleId?: ID;
};

export type CheckStatus = "Completed" | "In Progress" | "Pending";
export type TestStatus = "Pass" | "Fail" | "In Progress" | "Pending";

export type QualityBatch = {
  id: ID;
  sampleRef: string;
  name: string;
  img: string;
  mfrId: ID;
  orderId?: ID;
  category: string;
  size: number;
  mfgDate: string;
  market: string;
  release: string;
  status: "In Testing" | "Passed" | "Issues Found" | "Re-test";
  updatedAt: string;
  checklist: { label: string; status: CheckStatus }[];
  tests: { name: string; status: TestStatus }[];
  notes: Note[];
  shipmentId?: ID;
};

export type ShipStatus = "Pending" | "In Transit" | "Delivered" | "Delayed";
export const SHIP_STEPS = ["Packed", "Dispatched", "In Transit", "Out for Delivery", "Delivered"] as const;

export type Shipment = {
  id: ID;
  name: string;
  img: string;
  category: string;
  qty: number;
  carrier: "BlueDart Freight" | "DHL" | "Delhivery" | "FedEx";
  destination: string;
  eta: string;
  status: ShipStatus;
  step: number;
  updatedAt: string;
  note: string;
  orderId?: ID;
  value: number;
  incoterms: string;
  packages: string;
  stepDates: (string | null)[];
  events: { at: string; text: string; tone: "green" | "amber" }[];
  documents: string[];
  carrierContact: { name: string; role: string; img: string };
};

export type PayStatus = "Paid" | "Due Soon" | "Overdue" | "Scheduled" | "Pending";
export type Milestone = { invoice: string; name: string; due: string; amount: number; status: PayStatus; paidAt?: string; ref?: string };
export type PaymentPlan = { orderId: ID; name: string; img: string; mfrId: ID; stage: string; milestones: Milestone[]; notes: Note[]; documents: string[] };

export type ProductStage = "Draft" | "In Development" | "Active" | "Approved" | "In Production" | "Archived";
export type Product = {
  id: ID;
  name: string;
  img: string;
  category: string;
  tags: string[];
  mfrId: ID;
  stage: ProductStage;
  moq: number;
  updatedAt: string;
  brief: string;
  market: string[];
  certs: string[];
  packaging: { name: string; detail: string; img: string; primary?: boolean }[];
};

export type Activity = { id: ID; at: string; who: string; img?: string; text: string; tag: "Sample" | "Production" | "Shipment" | "Quality" | "Enquiry" | "Payment" | "Product" | "Manufacturer"; href: string };
export type Export = { file: string; type: string; at: string; by: string };
export type Message = { id: ID; at: string; to: string; subject: string; body: string };

export type ConsoleState = {
  v: number;
  user: { name: string; role: string; img: string; email: string };
  workspace: string;
  manufacturers: Manufacturer[];
  enquiries: Enquiry[];
  samples: Sample[];
  orders: Order[];
  quality: QualityBatch[];
  issues: Issue[];
  compliance: { name: string; status: "Valid" | "Expiring" | "Missing" }[];
  shipments: Shipment[];
  payments: PaymentPlan[];
  products: Product[];
  activity: Activity[];
  exports: Export[];
  messages: Message[];
  readNotifications: ID[];
  /** Who is signed in to each portal. `user` stays the brand user. */
  people: Record<Portal, Person>;
  /** The factory, supplier and distributor this demo's portals belong to. */
  makerId: ID;
  supplierId: ID;
  distributor: { name: string; city: string; area: string };
  leads: FactoryLead[];
  capacity: CapacityLine[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  supplierStock: StockItem[];
  distStock: DistStock[];
  retailOrders: RetailOrder[];
  routes: Route[];
  grns: Grn[];
  schemes: Scheme[];
};

/* ---------- network portals: manufacturer, supplier, distributor ---------- */

export type Portal = "brand" | "maker" | "supplier" | "distributor";
export type Person = { name: string; role: string; img?: string; email: string };

/** Leads a factory brings in from outside Scouthru (IndiaMART, WhatsApp, calls). */
export type FactoryLead = { id: ID; product: string; buyer: string; source: "IndiaMART" | "WhatsApp" | "Phone" | "Email"; qty: number; at: string; status: "New" | "Quoted" | "Won" | "Lost"; note: string; quote?: number };
export type CapacityLine = { line: string; perMonth: number; unit: string; formats: string[] };

export type Supplier = { id: ID; name: string; city: string; state: string; kind: "Packaging" | "Ingredients"; rating: number; categories: string[] };
export type MaterialLine = { sku: string; name: string; qty: number; unit: string };
export type POStatus = "RFQ" | "Quoted" | "Confirmed" | "Dispatched" | "Received" | "Paid" | "Declined";
export type PurchaseOrder = {
  id: ID;
  supplierId: ID;
  mfrId: ID;
  orderId?: ID;
  title: string;
  lines: MaterialLine[];
  needBy: string;
  status: POStatus;
  source: "Scouthru" | "IndiaMART" | "WhatsApp" | "Phone";
  quote?: { total: number; leadDays: number; note: string; at: string };
  invoice?: { no: string; amount: number; due: string; paidAt?: string; ref?: string };
  vehicle?: string;
  createdAt: string;
  updatedAt: string;
  events: { at: string; text: string }[];
};
export type StockItem = { sku: string; name: string; spec: string; unit: string; onHand: number; reserved: number; price: number; moq: number; leadDays: number };

export type DistStock = { sku: string; product: string; brand: string; img: string; onHand: number; reorderAt: number; batch: string; expiry: string; mrp: number; price: number };
export type RetailOrder = {
  id: ID;
  retailer: string;
  area: string;
  lines: { sku: string; qty: number }[];
  value: number;
  status: "New" | "Packed" | "Out for Delivery" | "Delivered" | "Cancelled";
  routeId?: ID;
  payment: "Due" | "Collected";
  at: string;
  deliveredAt?: string;
  collected?: { at: string; mode: "Cash" | "UPI" | "Cheque"; amount: number; ref: string };
};
export type Route = { id: ID; name: string; day: string; areas: string[]; van: string; driver: string };
export type Grn = { shipmentId: ID; at: string; lines: { sku: string; product: string; invoiced: number; received: number; damaged: number }[]; claim?: string };
export type Scheme = { id: ID; brand: string; title: string; detail: string; validTill: string; active: boolean };
