import type { ConsoleState } from "./types";

/**
 * The headline counts, defined once. The website home, the dashboard's top row and
 * its pipeline all read these, so the same label never shows two different numbers.
 */

export const openEnquiries = (s: ConsoleState) => s.enquiries.filter((e) => e.stage !== "Closed");

export const samplesInReview = (s: ConsoleState) => s.samples.filter((x) => ["Submitted", "In Review", "Testing", "Feedback"].includes(x.status));

/** Confirmed orders with a batch still to finish. Unconfirmed ones are "awaiting start". */
export const ordersRunning = (s: ConsoleState) => s.orders.filter((o) => o.confirmed && o.batches.some((b) => b.status !== "Completed"));

/** On the way: in transit or delayed. */
export const shipmentsMoving = (s: ConsoleState) => s.shipments.filter((x) => x.status === "In Transit" || x.status === "Delayed");
