"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import StudentFormModal, {
  ParentOption,
  StudentFormValues,
} from "@/components/dashboard/StudentFormModal";
import { Pencil, Plus, ShieldAlert } from "lucide-react";

type MeResponse = {
  id?: string;
  role?: string;
};

type Student = {
  id: string;
  userId: string;
  parentId: string;
  name: string;
  level: string;
  allergies?: string | null;
  active: boolean;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    active: boolean;
    role: string;
  };
  studentPackages?: {
    id: string;
    status: string;
    remaining: number;
    package: {
      name: string;
    };
  }[];
};

export default function ParentChildrenPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: me } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => axios.get("/api/me").then((response) => response.data),
  });

  const { data: children = [], isLoading } = useQuery<Student[]>({
    queryKey: ["parent-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const parentOptions: ParentOption[] = me?.id
    ? [
        {
          id: me.id,
          name: "Mi cuenta",
          email: "cuenta-familiar@theclubhouse.local",
        },
      ]
    : [];

  const createMutation = useMutation({
    mutationFn: (payload: StudentFormValues) => axios.post("/api/students", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-students"] });
      setShowCreateModal(false);
      setFeedback("Hijo agregado correctamente.");
      setError("");
    },
    onError: (requestError: unknown) => {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : "No se pudo agregar el hijo.";
      setFeedback("");
      setError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: StudentFormValues) =>
      axios.put(`/api/students/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-students"] });
      setSelectedStudent(null);
      setFeedback("Datos del hijo actualizados correctamente.");
      setError("");
    },
    onError: (requestError: unknown) => {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : "No se pudo actualizar el hijo.";
      setFeedback("");
      setError(message);
    },
  });

  const canManageChildren = parentOptions.length > 0;

  return (
    <div>
      <Header
        title="Mis Hijos"
        subtitle="Agrega y actualiza estudiantes vinculados a tu cuenta familiar"
        actions={
          <button
            type="button"
            disabled={!canManageChildren}
            onClick={() => {
              setError("");
              setFeedback("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-4 w-4" />
            Agregar Hijo
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Cargando hijos...
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Aún no tienes hijos registrados.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Usa el botón Agregar Hijo para crear el primer estudiante.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              <Plus className="h-4 w-4" />
              Crear Primer Hijo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{child.name}</div>
                    <div className="text-sm text-slate-500">{child.level}</div>
                  </div>
                  <StatusBadge status={child.active ? "ACTIVE" : "INACTIVE"} />
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>Alergias/Restricciones: {child.allergies ?? "Ninguna"}</div>
                  {child.allergies ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Con alertas
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  {child.studentPackages?.[0]?.package.name ?? "Sin paquete activo"}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setFeedback("");
                    setSelectedStudent(child);
                  }}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && canManageChildren ? (
        <StudentFormModal
          title="Agregar Hijo"
          parents={parentOptions}
          lockParent
          submitting={createMutation.isPending}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(values) => createMutation.mutate(values)}
          initialData={{
            parentId: parentOptions[0].id,
            name: "",
            email: "",
            phone: "",
            level: "ELEMENTARY",
            allergies: "",
            active: true,
          }}
        />
      ) : null}

      {selectedStudent && canManageChildren ? (
        <StudentFormModal
          title="Editar Hijo"
          parents={parentOptions}
          lockParent
          submitting={updateMutation.isPending}
          onClose={() => setSelectedStudent(null)}
          onSubmit={(values) => updateMutation.mutate(values)}
          initialData={{
            id: selectedStudent.id,
            userId: selectedStudent.userId,
            parentId: selectedStudent.parentId,
            name: selectedStudent.name,
            email: selectedStudent.user?.email ?? "",
            phone: selectedStudent.user?.phone ?? "",
            level: selectedStudent.level,
            allergies: selectedStudent.allergies ?? "",
            active: selectedStudent.active,
          }}
        />
      ) : null}
    </div>
  );
}