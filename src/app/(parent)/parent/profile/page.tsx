import { auth } from "@/auth";
import Header from "@/components/dashboard/Header";
import { redirect } from "next/navigation";

export default async function ParentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <Header title="Mi Perfil" subtitle="Datos de la cuenta familiar" />
      <div className="p-6">
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</div>
              <div className="mt-1 text-slate-900">{session.user.name ?? "Usuario"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
              <div className="mt-1 text-slate-900">{session.user.email ?? ""}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}