import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

// Derives the parent's true pending/approved balance straight from the
// records that actually charge or pay it down, instead of trusting the
// running counters on ParentBalance. Those counters are patched
// incrementally (order/package charge on creation, refund on cancel,
// payment approval), and incremental patches can't be perfectly undone once
// a pendingBalance floor-at-zero clamp has erased how much was really owed —
// recomputing from source is the only way to self-heal after a correction
// (e.g. an admin fixing a payment amount after the fact).
export async function recomputeParentBalance(tx: TxClient, parentId: string) {
  const [orders, packages, approvedPayments] = await Promise.all([
    tx.order.findMany({
      where: { parentId, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    tx.studentPackage.findMany({
      where: {
        student: { parentId },
        status: { notIn: ["CANCELLED", "CANCELLED_BY_ADMIN"] },
      },
      select: { pricePaid: true },
    }),
    tx.payment.aggregate({
      where: { parentId, orderId: null, status: "APPROVED" },
      _sum: { amount: true },
    }),
  ]);

  const totalCharged =
    orders.reduce((sum, order) => sum + order.total, 0) +
    packages.reduce((sum, sp) => sum + sp.pricePaid, 0);
  const totalApproved = approvedPayments._sum.amount ?? 0;

  return {
    pendingBalance: Math.max(0, totalCharged - totalApproved),
    approvedBalance: totalApproved,
  };
}
