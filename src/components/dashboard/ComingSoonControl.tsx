"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Rocket } from "lucide-react";
import {
  formatCostaRicaDateTime,
  toCostaRicaDateTimeLocalValue,
} from "@/lib/coming-soon-date";

type ComingSoonSettings = {
  comingSoonEnabled: boolean;
  comingSoonAt: string | null;
};

export default function ComingSoonControl({
  initial,
}: {
  initial: ComingSoonSettings;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery<ComingSoonSettings>({
    queryKey: ["coming-soon-settings"],
    queryFn: () => axios.get("/api/settings/coming-soon").then((r) => r.data),
    initialData: initial,
  });

  const [dateInput, setDateInput] = useState(() =>
    initial.comingSoonAt ? toCostaRicaDateTimeLocalValue(new Date(initial.comingSoonAt)) : ""
  );

  const mutation = useMutation({
    mutationFn: (payload: { comingSoonEnabled?: boolean; comingSoonAt?: string | null }) =>
      axios.patch("/api/settings/coming-soon", payload).then((r) => r.data),
    onSuccess: (updated: ComingSoonSettings) => {
      queryClient.setQueryData(["coming-soon-settings"], updated);
      if (updated.comingSoonAt) {
        setDateInput(toCostaRicaDateTimeLocalValue(new Date(updated.comingSoonAt)));
      }
    },
  });

  const enabled = data?.comingSoonEnabled ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Modo &quot;Muy pronto&quot;</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Reemplaza el contenido de la página de inicio con un aviso de &quot;muy pronto&quot;.
              El resto del sitio (menú, inicio de sesión, paneles) sigue funcionando normal. Solo
              tú, desde aquí, puedes desactivarlo — no se apaga solo al llegar la fecha.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => mutation.mutate({ comingSoonEnabled: !enabled })}
          disabled={mutation.isPending}
          className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-cyan-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fecha y hora estimada (Costa Rica)
          </label>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button
          type="button"
          disabled={mutation.isPending || !dateInput}
          onClick={() => mutation.mutate({ comingSoonAt: dateInput })}
          className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
        >
          Guardar fecha
        </button>
        {data?.comingSoonAt && (
          <p className="text-xs text-slate-500">
            Mostrando: <span className="font-semibold text-slate-700">{formatCostaRicaDateTime(new Date(data.comingSoonAt), "es")}</span>
          </p>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide">
        Estado actual:{" "}
        <span className={enabled ? "text-cyan-600" : "text-slate-400"}>
          {enabled ? "Activado — el inicio muestra \"muy pronto\"" : "Desactivado — el inicio está visible normalmente"}
        </span>
      </p>
    </div>
  );
}
