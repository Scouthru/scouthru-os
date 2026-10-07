"use client";

import { DeskHeader } from "@/components/desk";
import { Btn } from "@/components/ui";
import { RoutesRow } from "@/components/distributor";
import { useStore } from "@/lib/store";

export default function Routes() {
  const { update, toast } = useStore();
  return (
    <>
      <DeskHeader title="Routes" sub="Today's vans and bikes: stops delivered and money collected, live." actions={<Btn variant="flame" onClick={() => { update((d) => { d.routes.forEach((r) => { if (r.status === "Loading") { r.status = "Out"; r.note = ""; } }); }); toast("All vans out"); }}>Load vans</Btn>} />
      <RoutesRow />
    </>
  );
}
