"use client";

import { DeskHeader } from "@/components/desk";
import { CollectionsCard, OverdueRetailers } from "@/components/distributor";

export default function Collections() {
  return (
    <>
      <DeskHeader title="Collections" sub="What retailers owe, by age. UPI links and reminders go out on WhatsApp." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <CollectionsCard title="To collect" />
        <OverdueRetailers />
      </div>
    </>
  );
}
