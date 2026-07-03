"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import StudentFormModal, {
  ParentOption,
  StudentFormValues,
} from "@/components/dashboard/StudentFormModal";
import { ArrowLeft, Mail, Phone, Plus, UserCircle, Pencil } from "lucide-react";

type ParentDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  parentStudents: Array<{
    id: string;
    name: string;
    grade: string;
    level: string;
    allergies?: string | null;
    restrictions?: string | null;
    medicalNotes?: string | null;
    active: boolean;
    user: {
      id: string;
      email: string;
      phone?: string | null;
      active: boolean;
    };
  }>;
};

function ParentInfoModal({
  parent,
  onClose,
  onSave,
  saving,
}: {
  parent: ParentDetail;
  onClose: () => void;
  onSave: (values: { name: string; email: string; phone: string; active: boolean }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(parent.name);
  const [email, setEmail] = useState(parent.email);
  const [phone, setPhone] = useState(parent.phone ?? "");
  const [active, setActive] = useState(parent.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Editar padre/madre</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">Telefono</label>
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
            Cuenta activa
          </label>
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
            disabled={saving}
            onClick={() => onSave({ name, email, phone, active })}
            className="h-10 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminParentDetailPage() {
  const params = useParams<{ id: string }>();
  const parentId = params?.id;
  const queryClient = useQueryClient();
  const [showParentModal, setShowParentModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ParentDetail["parentStudents"][number] | null>(null);

  const { data: parent, isLoading } = useQuery<ParentDetail>({
    queryKey: ["parent-detail", parentId],
    queryFn: () => axios.get(`/api/users/${parentId}`).then((r) => r.data),
    enabled: Boolean(parentId),
  });

  const updateParentMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; phone: string; active: boolean }) =>
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

  const parentOptions = useMemo<ParentOption[]>(() => {
    if (!parent) return [];
    return [{ id: parent.id, name: parent.name, email: parent.email }];
  }, [parent]);

  if (isLoading) {
    return (
      <div>
        <Header title="Detalle de Padre" subtitle="Cargando informacion..." />
        <div className="p-6 text-sm text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!parent || parent.role !== "PARENT") {
    return (
      <div>
        <Header title="Detalle de Padre" subtitle="No encontrado" />
        <div className="p-6 text-sm text-slate-500">Este usuario no existe o no es padre/madre.</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Detalle de Padre"
        subtitle="Informacion personal, edicion y gestion de hijos"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowParentModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Editar padre
            </button>
            <button
              type="button"
              onClick={() => setShowStudentModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              <Plus className="h-4 w-4" />
              Nuevo hijo
            </button>
          </div>
        }
      />

      <div className="space-y-5 p-6">
        <Link
          href="/admin/parents"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a padres
        </Link>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                <UserCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{parent.name}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  {parent.email}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4" />
                  {parent.phone ?? "Sin telefono"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Estado de cuenta</div>
            <div className="mt-2">
              <StatusBadge status={parent.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Registro: {new Date(parent.createdAt).toLocaleDateString("es-CR")}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Hijos asociados ({parent.parentStudents.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Estudiante</th>
                <th className="px-5 py-3 text-left">Acceso</th>
                <th className="px-5 py-3 text-left">Grado/Nivel</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parent.parentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No hay hijos asociados.
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
                      <div className="text-xs text-slate-500">{student.user.phone ?? "Sin telefono"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div>{student.grade}</div>
                      <div className="text-xs text-slate-500">{student.level}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={student.active ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showParentModal && (
        <ParentInfoModal
          parent={parent}
          saving={updateParentMutation.isPending}
          onClose={() => setShowParentModal(false)}
          onSave={(values) => updateParentMutation.mutate(values)}
        />
      )}

      {showStudentModal && (
        <StudentFormModal
          title="Crear hijo"
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
            grade: "",
            level: "ELEMENTARY",
            allergies: "",
            restrictions: "",
            medicalNotes: "",
            active: true,
          }}
        />
      )}

      {selectedStudent && (
        <StudentFormModal
          title="Editar hijo"
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
            email: selectedStudent.user.email,
            phone: selectedStudent.user.phone ?? "",
            grade: selectedStudent.grade,
            level: selectedStudent.level,
            allergies: selectedStudent.allergies ?? "",
            restrictions: selectedStudent.restrictions ?? "",
            medicalNotes: selectedStudent.medicalNotes ?? "",
            active: selectedStudent.active,
          }}
        />
      )}
    </div>
  );
}
