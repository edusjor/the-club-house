"use client";

import BalancesView from "@/components/balances/BalancesView";

export default function VendorBalancesPage() {
  return <BalancesView parentDetailBasePath="/vendor/parents" canEditLimit={false} />;
}
