/**
 * Reads a half-written requirement ("need 5k protein bars 60g hyd by nov fssai")
 * and pulls out what a factory needs to quote. Runs in the browser, no network call.
 */

export type ParsedRequirement = {
  product: string;
  qty: number | null;
  unit: string;
  pack: string;
  city: string;
  when: string;
  certs: string[];
  missing: ("product" | "quantity" | "city" | "when")[];
};

const CITIES: [RegExp, string][] = [
  [/\b(hyd|hyderabad|secunderabad)\b/, "Hyderabad"],
  [/\b(blr|bangalore|bengaluru)\b/, "Bengaluru"],
  [/\b(chennai|madras)\b/, "Chennai"],
  [/\b(pune)\b/, "Pune"],
  [/\b(mumbai|bombay)\b/, "Mumbai"],
  [/\b(vijayawada|vja)\b/, "Vijayawada"],
  [/\b(delhi|ncr|gurgaon|noida)\b/, "Delhi NCR"],
  [/\b(kolkata|calcutta)\b/, "Kolkata"],
  [/\b(ahmedabad)\b/, "Ahmedabad"],
  [/\b(guntur)\b/, "Guntur"],
];

const CERTS: [RegExp, string][] = [
  [/\bfssai\b/, "FSSAI"], [/\bgmp\b/, "GMP"], [/\biso\b/, "ISO"], [/\borganic\b/, "Organic"],
  [/\bhalal\b/, "Halal"], [/\bvegan\b/, "Vegan"], [/\bsugar[- ]?free\b/, "Sugar-free"],
];

const UNITS = "jars|jar|units|unit|packs|pack|pcs|pieces|pouches|pouch|bottles|bottle|boxes|box|bars|bar|sachets|sachet|tubes|tube|cans|can|kg|kgs|litres|liters|ltr|tonnes|tons";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FILLER = /\b(i|we|need|needs|needed|want|wanted|looking|for|to|get|make|made|manufacture|manufacturer|supplier|a|an|the|of|some|about|around|approx|approximately|pls|please|urgent|urgently|asap|in|by|at|and|with|deliver|delivery|before|within|from|our|my|brand|qty|quantity|moq|around|nos|no)\b/g;

function toNumber(raw: string, mult?: string): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!mult) return Math.round(n);
  const m = mult.toLowerCase();
  if (m === "k" || m === "thousand") return Math.round(n * 1000);
  if (m === "l" || m === "lakh" || m === "lakhs" || m === "lac") return Math.round(n * 100000);
  return Math.round(n);
}

export function parseRequirement(input: string): ParsedRequirement {
  let t = ` ${input.toLowerCase().replace(/\s+/g, " ")} `;
  const take = (re: RegExp) => { t = t.replace(re, " "); };

  // pack size first, so "60g" or "300 ml" is never read as the order quantity
  let pack = "";
  const pm = t.match(/(\d+(?:\.\d+)?)\s?(g|gm|gms|grams|kg|ml|l|ltr)\b(?!\s*(?:jars|packs|units|bottles|pouches))/);
  if (pm) {
    const u = pm[2].startsWith("g") ? "g" : pm[2] === "ltr" ? "L" : pm[2] === "l" ? "L" : pm[2];
    pack = `${pm[1]}${u}`;
    take(new RegExp(pm[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  let qty: number | null = null;
  let unit = "units";
  const qm = t.match(new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s?(k|thousand|lakh|lakhs|lac|l)?\\s?(${UNITS})\\b`));
  const qm2 = qm ?? t.match(/(\d[\d,]*(?:\.\d+)?)\s?(k|thousand|lakh|lakhs|lac)\b/) ?? t.match(/\b(\d{3,}[\d,]*)\b/);
  if (qm2) {
    qty = toNumber(qm2[1], qm2[2]);
    const u = qm?.[3];
    if (u) unit = u.endsWith("s") || ["kg", "kgs", "ltr"].includes(u) ? u.replace(/^kgs$/, "kg") : `${u}s`.replace(/xs$/, "xes").replace(/chs$/, "ches");
    take(new RegExp(qm2[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  if (unit === "units") {
    // "2 lakh millet chips pouches": the pack word can sit away from the number
    const w = t.match(/\b(jars|pouches|bottles|boxes|bars|sachets|tubes|cans|packs)\b/);
    if (w) unit = w[1];
  }

  let city = "";
  for (const [re, name] of CITIES) if (re.test(t)) { city = name; take(re); break; }

  let when = "";
  const wk = t.match(/\b(\d+)\s?(weeks?|wks?|days?|months?)\b/);
  const mo = t.match(new RegExp(`\\b(?:end of |by |before )?(${MONTHS.join("|")})[a-z]*\\b`));
  if (/\b(asap|urgent|urgently|immediately)\b/.test(t)) when = "As soon as possible";
  if (wk) { const n = wk[1]; const u = wk[2].startsWith("w") ? "weeks" : wk[2].startsWith("d") ? "days" : "months"; when = `In ${n} ${n === "1" ? u.slice(0, -1) : u}`; take(new RegExp(wk[0])); }
  else if (mo) { when = `By ${MONTH_NAME[MONTHS.indexOf(mo[1])]}`; take(new RegExp(mo[0])); }
  else if (/\bnext month\b/.test(t)) { when = "Next month"; take(/\bnext month\b/); }
  else if (/\bend of (the )?month\b/.test(t)) { when = "End of this month"; take(/\bend of (the )?month\b/); }

  const certs: string[] = [];
  for (const [re, name] of CERTS) if (re.test(t)) { certs.push(name); if (name !== "Sugar-free" && name !== "Vegan" && name !== "Organic") take(re); }

  // what's left, minus filler words and stray symbols, is the product
  const rest = t.replace(/[^a-z\s-]/g, " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
  const product = rest ? rest.replace(/\b\w/g, (c) => c.toUpperCase()) + (pack ? ` ${pack}` : "") : "";

  const missing: ParsedRequirement["missing"] = [];
  if (!rest) missing.push("product");
  if (!qty) missing.push("quantity");
  if (!city) missing.push("city");
  if (!when) missing.push("when");
  return { product, qty, unit, pack, city, when, certs, missing };
}
