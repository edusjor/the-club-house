"use client";

import BalancesView from "@/components/balances/BalancesView";

export default function AdminBalancesPage() {
  return <BalancesView parentDetailBasePath="/admin/parents" canEditLimit />;
}
