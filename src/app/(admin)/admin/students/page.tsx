"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import { formatDateTime } from "@/lib/utils";
import StudentFormModal, {
  ParentOption,
  StudentFormValues,
} from "@/components/dashboard/StudentFormModal";
import { Search, GraduationCap, ShieldAlert, Plus, Pencil } from "lucide-react";

type Student = {
  id: string;
  userId: string;
  name: string;
  parentId: string;
  grade: string;
  level: string;
  allergies?: string | null;
  medicalNotes?: string | null;
  restrictions?: string | null;
  active: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    active: boolean;
    role: string;
  };
  parent?: {
    id: string;
    name: string;
    email: string;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students", "admin"],
    queryFn: () => axios.get("/api/students").then((r) => r.data),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => axios.get("/api/users").then((r) => r.data),
  });

  const parents = useMemo<ParentOption[]>(
    () => users.filter((user) => user.role === "PARENT").map((user) => ({ id: user.id, name: user.name, email: user.email })),
    [users]
  );

  const createMutation = useMutation({
    mutationFn: (payload: StudentFormValues) => axios.post("/api/students", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: StudentFormValues) =>
      axios.put(`/api/students/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setSelectedStudent(null);
    },
  });

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(q) ||
        (student.user?.email ?? "").toLowerCase().includes(q) ||
        student.grade.toLowerCase().includes(q) ||
        student.level.toLowerCase().includes(q) ||
        (student.parent?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  return (
    <div>
      <Header
        title="Estudiantes"
        subtitle="Consulta y administra los estudiantes registrados"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4" />
            Nuevo Estudiante
          </button>
        }
      />

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, grado, nivel o padre..."
              className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Estudiante
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Acceso
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Grado / Nivel
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Padre/Madre
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Alertas
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Registro
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Cargando estudiantes...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No se encontraron estudiantes.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const hasAlerts = Boolean(student.allergies || student.restrictions);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-700">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-500">ID: {student.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-700">
                          <p className="font-medium">{student.user?.email ?? "Sin email"}</p>
                          <p className="text-xs text-slate-500">{student.user?.phone ?? "Sin telefono"}</p>
                        </td>

                        <td className="px-5 py-3.5 text-slate-700">
                          <p className="font-medium">{student.grade}</p>
                          <p className="text-xs text-slate-500">{student.level}</p>
                        </td>

                        <td className="px-5 py-3.5 text-slate-700">
                          <p className="font-medium">{student.parent?.name ?? "Sin asignar"}</p>
                          <p className="text-xs text-slate-500">{student.parent?.email ?? "—"}</p>
                        </td>

                        <td className="px-5 py-3.5">
                          {hasAlerts ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Con alertas
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Sin alertas</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              student.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {student.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {formatDateTime(student.createdAt)}
                        </td>

                        <td className="px-5 py-3.5">
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <StudentFormModal
          title="Nuevo Estudiante"
          parents={parents}
          onClose={() => setShowModal(false)}
          submitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      )}

      {selectedStudent && (
        <StudentFormModal
          title="Editar Estudiante"
          parents={parents}
          initialData={{
            id: selectedStudent.id,
            userId: selectedStudent.userId,
            parentId: selectedStudent.parentId,
            name: selectedStudent.name,
            email: selectedStudent.user?.email ?? "",
            phone: selectedStudent.user?.phone ?? "",
            grade: selectedStudent.grade,
            level: selectedStudent.level,
            allergies: selectedStudent.allergies ?? "",
            restrictions: selectedStudent.restrictions ?? "",
            medicalNotes: selectedStudent.medicalNotes ?? "",
            active: selectedStudent.active,
          }}
          onClose={() => setSelectedStudent(null)}
          submitting={updateMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
        />
      )}
    </div>
  );
}

