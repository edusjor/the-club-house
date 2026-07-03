import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { redirect } from "next/navigation";

async function getChildren(parentId: string) {
  return prisma.student.findMany({
    where: { parentId },
    include: { studentPackages: { where: { status: "ACTIVE" }, include: { package: true } } },
    orderBy: { name: "asc" },
  });
}

export default async function ParentChildrenPage() {
  const session = await auth();
  const parentId = (session?.user as { id?: string } | undefined)?.id;
  if (!parentId) redirect("/login");

  const children = await getChildren(parentId);

  return (
    <div>
      <Header title="Mis Hijos" subtitle="Resumen de estudiantes vinculados a la cuenta familiar" />
      <div className="p-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {children.map((child) => (
          <div key={child.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{child.name}</div>
                <div className="text-sm text-slate-500">{child.grade} · {child.level}</div>
              </div>
              <StatusBadge status={child.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div>Alergias: {child.allergies ?? "Ninguna"}</div>
              <div>Restricciones: {child.restrictions ?? "Ninguna"}</div>
              <div>Notas medicas: {child.medicalNotes ?? "Ninguna"}</div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              {child.studentPackages[0]?.package.name ?? "Sin paquete activo"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}