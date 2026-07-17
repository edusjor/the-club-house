import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import ReceiptFileLink from "@/components/ReceiptFileLink";
import { formatReceiptSummary, parsePaymentReceipt } from "@/lib/payment-receipt";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function ParentReceiptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const parentId = (session?.user as { id?: string } | undefined)?.id;
  if (!parentId) redirect(`/${locale}/login`);

  const [receipts, dict] = await Promise.all([
    prisma.payment.findMany({ where: { parentId, receipt: { not: null } }, orderBy: { createdAt: "desc" } }),
    getDictionary(locale),
  ]);
  const t = dict.parent.receipts;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-4">
        {receipts.map((receipt) => {
          const parsedReceipt = parsePaymentReceipt(receipt.receipt);

          return (
            <div key={receipt.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {parsedReceipt?.kind === "UPLOAD" ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{formatReceiptSummary(receipt.receipt)}</div>
                  <ReceiptFileLink
                    dataUrl={parsedReceipt.dataUrl}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    {t.viewFile}
                  </ReceiptFileLink>
                </div>
              ) : (
                <div className="font-semibold text-slate-900">{receipt.receipt}</div>
              )}
              <div className="text-sm text-slate-500">{t.amount}: {receipt.amount} · {t.status}: {receipt.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}