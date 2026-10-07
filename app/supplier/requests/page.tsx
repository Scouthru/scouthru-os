"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { RequestList } from "@/components/supplier";
import { useStore } from "@/lib/store";

export default function Requests() {
  const { s } = useStore();
  return (
    <>
      <DeskHeader title="Requests" sub="RFQs and reorders from factories, whichever platform they came in on. Reply within 24h to stay ranked." />
      <Panel><RequestList rows={s.rfqs} /></Panel>
    </>
  );
}
