import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-cyan-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Acceso Denegado</h1>
          <p className="text-slate-500 text-sm mb-6">
            No tienes permisos para acceder a esta sección. Por favor, comunícate con el administrador.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

