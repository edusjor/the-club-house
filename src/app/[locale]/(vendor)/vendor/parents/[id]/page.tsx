"use client";

import ParentDetailView from "@/components/parents/ParentDetailView";

export default function VendorParentDetailPage() {
  return (
    <ParentDetailView
      backHref="/vendor/saldos"
      canEdit={false}
      canManagePayments
      canEditCreditLimit={false}
    />
  );
}
