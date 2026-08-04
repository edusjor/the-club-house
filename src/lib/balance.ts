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

  // net > 0: the parent still owes the difference (pendingBalance).
  // net < 0: approved payments cover more than what's charged — instead of
  // clamping that excess away (which used to just erase it), it's tracked as
  // creditBalance, which new charges draw down first (see chargeParentBalance).
  const net = totalCharged - totalApproved;

  return {
    pendingBalance: Math.max(0, net),
    creditBalance: Math.max(0, -net),
    approvedBalance: totalApproved,
  };
}

// Atomically charges `amount` against a parent's balance — draining any
// existing creditBalance first, only growing pendingBalance once the credit
// runs out. A single conditional UPDATE (not read-then-write), so two
// near-simultaneous charges for the same parent can't both read the same
// "before" balance and both slip past the credit limit: Postgres locks the
// matched row for this statement, so a concurrent transaction waits and
// re-evaluates the WHERE clause against the already-updated balance.
//
// Returns false (balance left untouched) only when enforceCreditLimit is
// true and the charge would push net owed beyond creditLimit.
export async function chargeParentBalance(
  tx: TxClient,
  parentId: string,
  amount: number,
  { enforceCreditLimit }: { enforceCreditLimit: boolean }
): Promise<boolean> {
  const rows = enforceCreditLimit
    ? await tx.$executeRaw`
        UPDATE "ParentBalance"
        SET
          "pendingBalance" = GREATEST(0, ("pendingBalance" - "creditBalance") + ${amount}),
          "creditBalance" = GREATEST(0, -(("pendingBalance" - "creditBalance") + ${amount}))
        WHERE "parentId" = ${parentId}
          AND ("pendingBalance" - "creditBalance") + ${amount} <= "creditLimit"
      `
    : await tx.$executeRaw`
        UPDATE "ParentBalance"
        SET
          "pendingBalance" = GREATEST(0, ("pendingBalance" - "creditBalance") + ${amount}),
          "creditBalance" = GREATEST(0, -(("pendingBalance" - "creditBalance") + ${amount}))
        WHERE "parentId" = ${parentId}
      `;

  return rows > 0;
}
