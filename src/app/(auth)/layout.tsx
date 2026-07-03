import { ChefHat } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-lg uppercase tracking-wide leading-tight">
              The Club House
            </p>
            <p className="text-cyan-400 text-xs font-semibold uppercase tracking-widest">
              Alimentación Escolar
            </p>
          </div>
        </div>

        {children}

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            ← Volver al sitio público
          </Link>
        </p>
      </div>
    </div>
  );
}

