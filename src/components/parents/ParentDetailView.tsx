"use client";

import { useMemo, useState } from "react";
import Link from "@/i18n/Link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import StudentFormModal, {
  ParentOption,
  StudentFormValues,
} from "@/components/dashboard/StudentFormModal";
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  UserCircle,
  Pencil,
  Eye,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "@/i18n/I18nProvider";
import { useLocale } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/config";
import {
  classifyPackageLifecycle,
  findScheduledRenewal,
  PACKAGE_LIFECYCLE_BADGE_CLASSES,
  type PackageLifecycle,
} from "@/lib/package-lifecycle";
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber, formatPaymentNumber, isInternalStudentEmail } from "@/lib/utils";
import { formatReceiptSummary, parsePaymentReceipt } from "@/lib/payment-receipt";
import ReceiptFileLink from "@/components/ReceiptFileLink";

type ParentDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  isStaff?: boolean;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  parentBalance: {
    pendingBalance: number;
    approvedBalance: number;
    creditBalance: number;
    creditLimit: number;
  } | null;
  orders: Array<{
    id: string;
    status: string;
    total: number;
    source: string;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      scheduledDate: string;
      student: { name: string };
      foodItem: { name: string };
    }>;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    receipt?: string | null;
    comment?: string | null;
    createdAt: string;
    orderId?: string | null;
  }>;
  parentStudents: Array<{
    id: string;
    name: string;
    level: string;
    allergies?: string | null;
    active: boolean;
    user: {
      id: string;
      email: string;
      phone?: string | null;
      active: boolean;
    };
    studentPackages: Array<{
      id: string;
      studentId: string;
      packageId: string;
      status: string;
      consumed: number;
      pricePaid: number;
      startDate: string;
      endDate?: string | null;
      package: { id: string; name: string; validityDays?: number | null };
    }>;
  }>;
};

const LIFECYCLE_LABEL_KEYS: Record<PackageLifecycle, string> = {
  ACTIVE: "parentDetailView.stateActive",
  EXPIRING_SOON: "parentDetailView.stateExpiringSoon",
  EXPIRED: "parentDetailView.stateExpired",
  NOT_STARTED: "parentDetailView.stateNotStarted",
};

function ParentInfoModal({
  parent,
  onClose,
  onSave,
  saving,
}: {
  parent: ParentDetail;
  onClose: () => void;
  onSave: (values: { name: string; email: string; phone: string; active: boolean; isStaff: boolean }) => void;
  saving: boolean;
}) {
  const t = useTranslations();
  const [name, setName] = useState(parent.name);
  const [email, setEmail] = useState(parent.email);
  const [phone, setPhone] = useState(parent.phone ?? "");
  const [active, setActive] = useState(parent.active);
  const [isStaff, setIsStaff] = useState(parent.isStaff ?? false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{t("parentDetailView.editParentModalTitle")}</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">{t("parentDetailView.nameLabel")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">{t("parentDetailView.emailLabel")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">{t("parentDetailView.phoneLabel")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
            {t("parentDetailView.activeAccountLabel")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isStaff}
              onChange={(e) => setIsStaff(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
            {t("parentDetailView.isStaffLabel")}
          </label>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("parentDetailView.cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave({ name, email, phone, active, isStaff })}
            className="h-10 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {saving ? t("parentDetailView.saving") : t("parentDetailView.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLimitModal({
  parent,
  onClose,
  onSave,
  saving,
}: {
  parent: ParentDetail;
  onClose: () => void;
  onSave: (creditLimit: number) => void;
  saving: boolean;
}) {
  const t = useTranslations();
  const [value, setValue] = useState(String(parent.parentBalance?.creditLimit ?? 0));
  const parsed = Number(value);
  const isValid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{t("parentDetailView.adjustLimitModalTitle")}</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("parentDetailView.newLimitLabel")}
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {!isValid && value.trim() !== "" ? (
              <p className="mt-1 text-xs text-red-600">{t("parentDetailView.limitInvalid")}</p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("parentDetailView.cancel")}
          </button>
          <button
            type="button"
            disabled={!isValid || saving}
            onClick={() => onSave(parsed)}
            className="h-10 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {saving ? t("parentDetailView.saving") : t("parentDetailView.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentDetailView({
  backHref,
  canEdit,
  canManagePayments,
  canEditCreditLimit,
}: {
  backHref: string;
  canEdit: boolean;
  canManagePayments: boolean;
  canEditCreditLimit: boolean;
}) {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const parentId = params?.id;
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const { update: updateSession } = useSession();
  const [showParentModal, setShowParentModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ParentDetail["parentStudents"][number] | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  const handleImpersonate = async (targetId: string) => {
    if (!window.confirm(t("parentDetailView.impersonateConfirm"))) {
      return;
    }
    setImpersonating(true);
    await updateSession({ impersonateUserId: targetId });
    router.push(localePath(locale, "/parent/dashboard"));
    router.refresh();
  };

  const { data: parent, isLoading } = useQuery<ParentDetail>({
    queryKey: ["parent-detail", parentId],
    queryFn: () => axios.get(`/api/users/${parentId}`).then((r) => r.data),
    enabled: Boolean(parentId),
  });

  const updateParentMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; phone: string; active: boolean; isStaff: boolean }) =>
      axios.put(`/api/users/${parentId}`, { ...payload, role: "PARENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-detail", parentId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowParentModal(false);
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (payload: StudentFormValues) => axios.post("/api/students", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-detail", parentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowStudentModal(false);
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: (payload: StudentFormValues) => axios.put(`/api/students/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-detail", parentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setSelectedStudent(null);
    },
  });

  const updateLimitMutation = useMutation({
    mutationFn: (creditLimit: number) => axios.put(`/api/admin/balances/${parentId}`, { creditLimit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-detail", parentId] });
      setShowLimitModal(false);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.put(`/api/payments/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-detail", parentId] }),
    onError: (error: unknown) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : t("parentDetailView.paymentUpdateError");
      alert(message);
    },
  });

  const parentOptions = useMemo<ParentOption[]>(() => {
    if (!parent) return [];
    return [{ id: parent.id, name: parent.name, email: parent.email }];
  }, [parent]);

  const allPackages = useMemo(() => {
    if (!parent) return [];
    return parent.parentStudents.flatMap((student) =>
      student.studentPackages.map((sp) => ({ ...sp, studentName: student.name }))
    );
  }, [parent]);

  if (isLoading) {
    return (
      <div>
        <Header title={t("parentDetailView.title")} subtitle={t("parentDetailView.loadingSubtitle")} />
        <div className="p-6 text-sm text-slate-500">{t("parentDetailView.loadingSubtitle")}</div>
      </div>
    );
  }

  if (!parent || parent.role !== "PARENT") {
    return (
      <div>
        <Header title={t("parentDetailView.title")} subtitle={t("parentDetailView.notFoundSubtitle")} />
        <div className="p-6 text-sm text-slate-500">{t("parentDetailView.notFoundBody")}</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={t("parentDetailView.title")}
        subtitle={t("parentDetailView.subtitle")}
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleImpersonate(parent.id)}
                disabled={impersonating}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                title={t("parentDetailView.viewAsParent")}
              >
                <Eye className="h-4 w-4" />
                {impersonating ? t("parentDetailView.enteringAsParent") : t("parentDetailView.viewAsParent")}
              </button>
              <button
                type="button"
                onClick={() => setShowParentModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                {t("parentDetailView.editParent")}
              </button>
              <button
                type="button"
                onClick={() => setShowStudentModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
              >
                <Plus className="h-4 w-4" />
                {t("parentDetailView.newChild")}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-5 p-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {canEdit ? t("parentDetailView.backToParents") : t("parentDetailView.backToBalances")}
        </Link>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                <UserCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{parent.name}</h2>
                  {parent.isStaff ? (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      {t("common.staffLabel")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  {parent.email}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4" />
                  {parent.phone ?? t("parentDetailView.noPhone")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{t("parentDetailView.accountStatus")}</div>
            <div className="mt-2">
              <StatusBadge status={parent.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {t("parentDetailView.registeredOn")} {new Date(parent.createdAt).toLocaleDateString(locale === "es" ? "es-CR" : "en-US")}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              {t("parentDetailView.childrenTitle").replace("{count}", String(parent.parentStudents.length))}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStudent")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colAccess")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colLevel")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStatus")}</th>
                {canEdit ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parent.parentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    {t("parentDetailView.noChildren")}
                  </td>
                </tr>
              ) : (
                parent.parentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-500">ID {student.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div>{student.user.email}</div>
                      <div className="text-xs text-slate-500">{student.user.phone ?? t("parentDetailView.noPhone")}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <StatusBadge status={student.level} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={student.active ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    {canEdit ? (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("parentDetailView.edit")}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <DollarSign className="h-4 w-4" />
              {t("parentDetailView.pendingBalance")}
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {formatCurrency(parent.parentBalance?.pendingBalance ?? 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-slate-500">{t("parentDetailView.availableCredit")}</div>
              {canEditCreditLimit ? (
                <button
                  type="button"
                  onClick={() => setShowLimitModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3" />
                  {t("parentDetailView.adjust")}
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {formatCurrency(
                Math.max(0, (parent.parentBalance?.creditLimit ?? 0) - (parent.parentBalance?.pendingBalance ?? 0))
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("parentDetailView.limitLabel")} {formatCurrency(parent.parentBalance?.creditLimit ?? 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{t("parentDetailView.accruedCredit")}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {formatCurrency(parent.parentBalance?.creditBalance ?? 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{t("parentDetailView.approvedPaymentsHistorical")}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {formatCurrency(parent.parentBalance?.approvedBalance ?? 0)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Package className="h-4 w-4" />
              {t("parentDetailView.packagesTitle")}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStudent")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colPackage")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStatus")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colConsumed")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colPaid")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colValidity")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {t("parentDetailView.noPackages")}
                  </td>
                </tr>
              ) : (
                allPackages.map((sp) => {
                  const lifecycle = sp.status === "ACTIVE" ? classifyPackageLifecycle(sp) : null;
                  const scheduledRenewal = lifecycle === "EXPIRED" ? findScheduledRenewal(sp, allPackages) : null;
                  return (
                    <tr key={sp.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{sp.studentName}</td>
                      <td className="px-5 py-3.5 text-slate-700">{sp.package.name}</td>
                      <td className="px-5 py-3.5">
                        {lifecycle ? (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PACKAGE_LIFECYCLE_BADGE_CLASSES[lifecycle]}`}>
                            {t(LIFECYCLE_LABEL_KEYS[lifecycle])}
                          </span>
                        ) : (
                          <StatusBadge status={sp.status} />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{sp.consumed}</td>
                      <td className="px-5 py-3.5 text-slate-700">{formatCurrency(sp.pricePaid)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {formatDate(sp.startDate)} — {sp.endDate ? formatDate(sp.endDate) : t("parentDetailView.noExpiry")}
                        {scheduledRenewal ? (
                          <div className="font-semibold text-emerald-600">
                            {t("parentDetailView.renewalScheduledFor")} {formatDate(scheduledRenewal.startDate)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <ShoppingCart className="h-4 w-4" />
              {t("parentDetailView.ordersTitle").replace("{count}", String(parent.orders.length))}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colOrderNumber")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colDate")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colSource")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStatus")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colDetail")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parent.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {t("parentDetailView.noOrders")}
                  </td>
                </tr>
              ) : (
                parent.orders.map((order) => {
                  const itemSummary = order.items
                    .slice(0, 3)
                    .map((item) => `${item.student.name}: ${item.foodItem.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`)
                    .join(", ");
                  const extra = order.items.length - 3;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">#{formatOrderNumber(order.id)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDateTime(order.createdAt)}</td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {order.source === "VENDOR" ? t("parentDetailView.sourceVendor") : t("parentDetailView.sourceParent")}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {itemSummary}
                        {extra > 0 ? ` ${t("parentDetailView.more").replace("{count}", String(extra))}` : ""}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <CreditCard className="h-4 w-4" />
              {t("parentDetailView.paymentsTitle").replace("{count}", String(parent.payments.length))}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colPaymentNumber")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colDate")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colAmount")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colStatus")}</th>
                <th className="px-5 py-3 text-left">{t("parentDetailView.colReceipt")}</th>
                {canManagePayments ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parent.payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {t("parentDetailView.noPaymentsRegistered")}
                  </td>
                </tr>
              ) : (
                parent.payments.map((payment) => {
                  const parsedReceipt = parsePaymentReceipt(payment.receipt);
                  const isUpdatingThis =
                    updatePaymentMutation.isPending && updatePaymentMutation.variables?.id === payment.id;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">#{formatPaymentNumber(payment.id)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {parsedReceipt?.kind === "UPLOAD" ? (
                          <ReceiptFileLink
                            dataUrl={parsedReceipt.dataUrl}
                            className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {formatReceiptSummary(payment.receipt)}
                          </ReceiptFileLink>
                        ) : (
                          formatReceiptSummary(payment.receipt)
                        )}
                      </td>
                      {canManagePayments ? (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            {payment.status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white">
                                <Check className="h-3 w-3" />
                                {t("parentDetailView.approved")}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdatingThis}
                                onClick={() => updatePaymentMutation.mutate({ id: payment.id, status: "APPROVED" })}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                <Check className="h-3 w-3" />
                                {t("parentDetailView.approve")}
                              </button>
                            )}
                            {payment.status === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-[11px] font-semibold text-white">
                                <X className="h-3 w-3" />
                                {t("parentDetailView.rejected")}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdatingThis}
                                onClick={() => updatePaymentMutation.mutate({ id: payment.id, status: "REJECTED" })}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                {t("parentDetailView.reject")}
                              </button>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showParentModal && canEdit && (
        <ParentInfoModal
          parent={parent}
          saving={updateParentMutation.isPending}
          onClose={() => setShowParentModal(false)}
          onSave={(values) => updateParentMutation.mutate(values)}
        />
      )}

      {showLimitModal && canEditCreditLimit && (
        <EditLimitModal
          parent={parent}
          saving={updateLimitMutation.isPending}
          onClose={() => setShowLimitModal(false)}
          onSave={(creditLimit) => updateLimitMutation.mutate(creditLimit)}
        />
      )}

      {showStudentModal && canEdit && (
        <StudentFormModal
          title={t("parentDetailView.createChildTitle")}
          parents={parentOptions}
          lockParent
          submitting={createStudentMutation.isPending}
          onClose={() => setShowStudentModal(false)}
          onSubmit={(values) => createStudentMutation.mutate(values)}
          initialData={{
            parentId: parent.id,
            name: "",
            email: "",
            phone: "",
            level: "ELEMENTARY",
            allergies: "",
            active: true,
          }}
        />
      )}

      {selectedStudent && canEdit && (
        <StudentFormModal
          title={t("parentDetailView.editChildTitle")}
          parents={parentOptions}
          lockParent
          submitting={updateStudentMutation.isPending}
          onClose={() => setSelectedStudent(null)}
          onSubmit={(values) => updateStudentMutation.mutate(values)}
          initialData={{
            id: selectedStudent.id,
            userId: selectedStudent.user.id,
            parentId: parent.id,
            name: selectedStudent.name,
            email: isInternalStudentEmail(selectedStudent.user.email) ? "" : selectedStudent.user.email,
            phone: selectedStudent.user.phone ?? "",
            level: selectedStudent.level,
            allergies: selectedStudent.allergies ?? "",
            active: selectedStudent.active,
          }}
        />
      )}
    </div>
  );
}
