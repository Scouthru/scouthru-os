export type Tint = "sage" | "blush" | "oat" | "sky" | "lilac" | "stone";

export type Product = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  format: string;
  pack: string;
  tint: Tint;
  tiers: { range: string; min: number; price: number; lead: string }[];
  moq: number;
  lead: string;
  unit: string;
  desc: string;
  options: { label: string; values: string[] }[];
  specs: [string, string][];
  included: string[];
  starter?: boolean;
};

export type Unit = {
  code: string;
  city: string;
  state: string;
  licences: string[];
  lines: string;
  category: string[];
  formats: string[];
  booked: number;
  moq: number;
  freeCap: number;
  lead: number;
  tags: string[];
  kind: string;
  /** Real name, revealed only after the buyer connects. */
  name: string;
  /** Profile fields from the founders' notes: shown on the unit page. */
  profile?: UnitProfile;
  /** Set for units listed through onboarding until Scouthru verifies them. */
  status?: "pending" | "verified" | "rejected";
};

export type UnitProfile = {
  areaSqft: number;
  founded: number;
  employees: number;
  about: string;
  facilities: string[];
  allergens: string[];
  dietary: string[];
  digital: string[];
  customers: string[];
  projects: { title: string; year: number; units: number }[];
  contacts: { role: string; vetted: boolean }[];
};

/** A factory's answer to a brand requirement. The brand compares these. */
export type Quote = {
  id: string;
  orderId: string;
  unit: string;
  factory: string;
  city: string;
  price: number;
  lead: number;
  moq: number;
  rating: number;
  note: string;
  fit: number;
  status: "sent" | "accepted" | "declined";
  at: string;
};

/** Anything Scouthru's own team has to act on. */
export type Case = {
  id: string;
  kind: "Dispute" | "Assisted sourcing" | "Factory issue" | "Credit request" | "Delivery issue";
  title: string;
  detail: string;
  from: string;
  orderId?: string;
  status: "Open" | "In progress" | "Resolved";
  resolution?: string;
  at: string;
};

export type Role = "brand" | "factory" | "supplier" | "distributor" | "admin";
export type Notice = { id: string; to: Role; text: string; href: string; at: string; read: boolean };

export type Pay = "paid" | "due" | "proof" | "later";
export type PhaseStatus = "done" | "active" | "todo";

export type Proof = { id: string; kind: string; title: string; detail: string; at: string; hash: string; verified: boolean; image?: string };

export type OrderStage = "enquiry" | "agreed" | "sample" | "production" | "qc" | "dispatch" | "delivered" | "closed";

export type Order = {
  id: string;
  product: string;
  qty: number;
  uom: string;
  brandId: string;
  factoryId: string;
  factory: string;
  factoryCity: string;
  deliverBy: string;
  stage: OrderStage;
  progress: number;
  health: "On track" | "Delayed 3d" | "Action" | "In transit" | "Closing" | "Completed" | "Awaiting factory";
  next: string;
  due: string;
  unitPrice: number;
  frozenTill: string;
  phases: { name: string; detail: string; pct: number; status: PhaseStatus; payPct: number; pay: Pay; payNote: string }[];
  payments: { label: string; pct: number; status: Pay }[];
  proofs: Proof[];
  changes: { id: string; text: string; note: string; status: "Awaiting factory" | "Awaiting you" | "Approved" | "Rejected"; by: "brand" | "factory"; priceDelta?: number }[];
  split: { inhouse: number; partner: number; partnerName?: string };
  chat: { from: "factory" | "brand"; text: string; at: string }[];
  docs: { name: string; meta: string }[];
  qc?: {
    by: string;
    date: string;
    sample: string;
    result: "PASS" | "FAIL";
    defects: number;
    limit: number;
    fill: string;
    count: string;
    checks: { label: string; detail: string; result: "Pass" | "Minor" | "Fail" }[];
    decision?: "approved" | "rework";
  };
  shipment?: { carrier: string; lr: string; eta: string; steps: { at: string; text: string; done: boolean }[]; docs: { name: string; status: string }[]; slot: string; receiver: string };
  delivery?: { at: string; ordered: number; received: number; damaged: number; windowEnds: string; settled: boolean; issue?: { kind: string; text: string; want: string; status: string }; rating?: { quality: number; time: number; comms: number } };
};

export type Action = { id: string; kind: "Pay" | "Sample" | "Change" | "QC" | "Quote"; title: string; detail: string; cta: string; orderId?: string; tone: "blush" | "sky" | "rose" | "mint" | "stone" };

export type Enquiry = {
  id: string;
  product: string;
  source: "Scouthru" | "IndiaMART" | "Phone call" | "WhatsApp" | "Referral" | "Email";
  moq: number;
  neededBy: string;
  region: string;
  fit: "Fits" | "Not your line" | "Needs partner unit";
  buyer: string;
  receivedHoursAgo: number;
  status: "new" | "quoted" | "declined" | "won";
  quote?: { price: number; lead: number };
  notes: string;
  /** The brand order this enquiry belongs to, when it came from a Scouthru requirement. */
  orderId?: string;
};

export type PartnerUnit = { code: string; city: string; lines: string; free: number; licences: string[]; shared: number };

export type RFQ = {
  id: string;
  type: "RFQ" | "Reorder";
  item: string;
  buyer: string;
  source: string;
  neededBy: string;
  city: string;
  note: string;
  stock: "In stock" | "Partial" | "Make to order";
  status: "new" | "quoted" | "accepted" | "declined";
};

export type Lead = {
  id: string;
  sources: string[];
  buyer: string;
  city: string;
  req: string;
  fit: "Partial stock" | "In stock" | "Below MOQ" | "Make to order" | "Out of radius";
  quality: "Genuine" | "Verified" | "Likely spam" | "Repeat buyer" | "Price-shopping";
  status: string;
  next: string;
  cta: "Quote" | "Follow up" | "Dismiss" | "Open" | "View PO";
  dismissed?: boolean;
};

export type PO = {
  id: string;
  title: string;
  factory: string;
  city: string;
  brandOrder: string;
  stage: "RFQ" | "Quoted" | "PO confirmed" | "Packed" | "Dispatched" | "GRN" | "Paid" | "Overdue pay";
  dispatchBy: string;
  payment: string;
  lines: { item: string; qty: number; rate: string; packed: number; batch: string }[];
  docs: { name: string; status: "Generated" | "Generate" | "Attached" }[];
  transport: "own" | "partner";
  invoice: number;
  photos: { label: string; image?: string }[];
  activity: { at: string; text: string }[];
};

export type StockItem = { name: string; spec: string; onHand: number | null; reserved: number | null; moq: string; band: string; lead: string; status: "Low vs demand" | "Healthy" | "9 days cover" | "MTO"; uom?: string };

export type Inbound = { id: string; brand: string; item: string; meta: string; status: "In transit" | "Receive" | "Claim" | "Received" };

export type GrnLine = { sku: string; pack: string; invoiced: number; received: number; damaged: number; batch: string; expiry: string };

export type RetailerOrder = {
  id: string;
  retailer: string;
  area: string;
  source: string;
  lines: number;
  value: number;
  route: string;
  scheme: string;
  credit: "OK" | "Over limit" | "Cash" | "Prepaid";
  status: "Picked" | "Short 2 SKUs" | "New" | "Credit hold" | "Delivered" | "Picking" | "Paid";
  stock: "All in" | "Short 2";
  inbox: string;
};

export type State = {
  v: number;
  view: "brand" | "factory" | "supplier" | "distributor" | null;
  products: Product[];
  units: Unit[];
  orders: Order[];
  actions: Action[];
  enquiries: Enquiry[];
  partnerUnits: PartnerUnit[];
  capacity: { line: string; total: number; booked: number; nextQ: number; months: { m: string; booked: number }[] };
  rfqs: RFQ[];
  leads: Lead[];
  pos: PO[];
  stock: StockItem[];
  inbound: Inbound[];
  grn: { lines: GrnLine[]; confirmed: boolean; claimSent: boolean; photos: { label: string; image?: string }[] };
  retailerOrders: RetailerOrder[];
  overdueRetailers: { name: string; amount: number; days: number; sent: boolean }[];
  claims: { brand: string; what: string; amount: number; status: "Submitted" | "Approved" | "Pending proof" }[];
  alerts: { id: string; kind: "Stockout" | "Expiry" | "Slow" | "Scheme"; title: string; detail: string; cta: string; done?: boolean }[];
  routes: { name: string; area: string; driver: string; stops: number; delivered: number; value: number; collect: number; collected: number; status: "Out" | "Loading" | "Done"; note: string }[];
  requirements: { id: string; product: string; qty: number; at: string; from: string }[];
  samples: { productId: string; at: string }[];
  quotes: Quote[];
  cases: Case[];
  notices: Notice[];
  /** Units the buyer has connected with (enquiry or sample); their names are shown. */
  connected: string[];
  qcVisits: { id: string; orderId: string; unit: string; agent: string; date: string; status: "Scheduled" | "Done" }[];
};
