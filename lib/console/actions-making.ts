import type { ConsoleState, Order } from "./types";

/** Tone names match components/console/kit Tone. */
type Tone = "green" | "orange" | "blue" | "violet" | "red" | "gray";

/** Where the order is: 0 Brief … 5 Delivery, 6 = delivered. Derived from batches, quality batches and shipments. */
export function orderProgress(s: ConsoleState, o: Order) {
  const allDone = o.batches.length > 0 && o.batches.every((b) => b.status === "Completed");
  const qbs = s.quality.filter((q) => q.orderId === o.id);
  const allPassed = allDone && o.batches.every((b) => qbs.some((q) => q.id === b.id && q.status === "Passed"));
  const ships = s.shipments.filter((x) => x.orderId === o.id);
  const dispatched = allPassed && ships.length > 0 && ships.some((x) => x.step >= 1);
  const delivered = dispatched && ships.every((x) => x.status === "Delivered");
  const current = !allDone ? 2 : !allPassed ? 3 : !dispatched ? 4 : !delivered ? 5 : 6;
  const t = new Date(o.targetDelivery).getTime();
  const est = [o.briefAt, o.sampleAt, o.productionAt, new Date(t - 12 * 864e5).toISOString(), new Date(t - 7 * 864e5).toISOString(), o.targetDelivery];
  return { current, est, allDone };
}

export function orderStatus(s: ConsoleState, o: Order): { label: string; tone: Tone } {
  if (!o.confirmed) return { label: "Awaiting Start", tone: "orange" };
  const { current } = orderProgress(s, o);
  return [
    { label: "Brief", tone: "gray" as Tone }, { label: "Sampling", tone: "orange" as Tone }, { label: "In Production", tone: "blue" as Tone },
    { label: "In Quality", tone: "violet" as Tone }, { label: "Ready to Dispatch", tone: "orange" as Tone }, { label: "In Transit", tone: "violet" as Tone }, { label: "Delivered", tone: "green" as Tone },
  ][current];
}

