"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { LEVELS } from "@/lib/utils";

export type ParentOption = {
  id: string;
  name: string;
  email: string;
};

export type StudentFormValues = {
  id?: string;
  userId?: string;
  parentId: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  grade: string;
  level: string;
  allergies: string;
  restrictions: string;
  medicalNotes: string;
  active: boolean;
};

interface StudentFormModalProps {
  title: string;
  parents: ParentOption[];
  initialData?: StudentFormValues;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => void;
  submitting?: boolean;
  lockParent?: boolean;
}

export default function StudentFormModal({
  title,
  parents,
  initialData,
  onClose,
  onSubmit,
  submitting,
  lockParent,
}: StudentFormModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<StudentFormValues>({
    id: initialData?.id,
    userId: initialData?.userId,
    parentId: initialData?.parentId ?? parents[0]?.id ?? "",
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    password: "",
    grade: initialData?.grade ?? "",
    level: initialData?.level ?? "ELEMENTARY",
    allergies: initialData?.allergies ?? "",
    restrictions: initialData?.restrictions ?? "",
    medicalNotes: initialData?.medicalNotes ?? "",
    active: initialData?.active ?? true,
  });

  const saveLabel = useMemo(() => {
    if (submitting) return "Guardando...";
    return initialData ? "Actualizar Estudiante" : "Crear Estudiante";
  }, [initialData, submitting]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Padre o Madre
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              disabled={lockParent}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            >
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Nombre del estudiante
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Email (opcional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Opcional para hijos"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Teléfono (opcional)
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Opcional para hijos"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {initialData ? "Nueva contraseña (opcional)" : "Contraseña (opcional)"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password ?? ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Opcional para hijos"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Grado
            </label>
            <input
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Nivel
            </label>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Alergias
            </label>
            <input
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="Ej: Maní"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Restricciones
            </label>
            <input
              value={form.restrictions}
              onChange={(e) => setForm({ ...form, restrictions: e.target.value })}
              placeholder="Ej: Sin lactosa"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Notas médicas
            </label>
            <textarea
              value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="md:col-span-2">
            <p className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-slate-700">
              Los hijos/estudiantes no ingresan directamente al sistema. Su acceso
              y gestión se realiza desde la cuenta del padre/madre.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-cyan-500"
              />
              Usuario y estudiante activo
            </label>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={submitting}
            className="h-10 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

