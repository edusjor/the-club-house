"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogOut, ShieldAlert } from "lucide-react";
import { useLocale } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/config";

type ImpersonationSessionUser = {
  name?: string | null;
  impersonating?: boolean;
  adminName?: string;
  impersonationWriteAllowed?: boolean;
};

export default function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState<"exit" | "toggle" | null>(null);

  const user = session?.user as ImpersonationSessionUser | undefined;

  if (!user?.impersonating) return null;

  const handleExit = async () => {
    setBusy("exit");
    await update({ stopImpersonation: true });
    router.push(localePath(locale, "/admin/parents"));
    router.refresh();
  };

  const handleToggleWrites = async () => {
    setBusy("toggle");
    await update({ setImpersonationWriteAllowed: !user.impersonationWriteAllowed });
    router.refresh();
    setBusy(null);
  };

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900 shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Estás viendo la cuenta de <strong>{user.name}</strong> como administrador
          {user.adminName ? ` (${user.adminName})` : ""}.{" "}
          {user.impersonationWriteAllowed
            ? "Modo completo: los cambios que hagas se guardarán."
            : "Modo solo lectura: no se pueden guardar cambios."}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
          <input
            type="checkbox"
            checked={Boolean(user.impersonationWriteAllowed)}
            onChange={handleToggleWrites}
            disabled={busy !== null}
            className="h-3.5 w-3.5 accent-amber-600"
          />
          Permitir cambios
        </label>
        <button
          type="button"
          onClick={handleExit}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir de esta vista
        </button>
      </div>
    </div>
  );
}
