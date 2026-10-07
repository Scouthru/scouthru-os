"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DeskHeader } from "@/components/desk";
import { Btn } from "@/components/ui";
import { OrdersTable } from "@/components/brand";
import { useStore } from "@/lib/store";

export default function Page() {
  return <Suspense><Orders /></Suspense>;
}

function Orders() {
  const { s } = useStore();
  const q = useSearchParams().get("q") ?? "";
  const t = q.toLowerCase();
  const mine = s.orders.filter((o) => o.brandId === "ruchika" && (!t || `${o.id} ${o.product} ${o.factory} ${o.factoryCity}`.toLowerCase().includes(t)));
  const closed = mine.filter((o) => o.stage === "closed");
  return (
    <>
      <DeskHeader
        title={q ? `Orders matching “${q}”` : "Orders"}
        sub={q ? <>{mine.length} found · <a href="/brand/orders" className="font-semibold text-ink underline">Clear search</a></> : "Every order from enquiry to final payment."}
        actions={<Btn variant="flame" href="/brand/new">+ New order</Btn>}
      />
      <OrdersTable orders={mine.filter((o) => o.stage !== "closed")} />
      {closed.length > 0 && (
        <div className="mt-5">
          <OrdersTable orders={closed} filters={false} />
        </div>
      )}
    </>
  );
}
