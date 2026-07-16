import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";

type ComingSoonPageProps = {
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  features?: string[];
};

export default function ComingSoonPage({
  title,
  subtitle,
  backHref,
  backLabel,
  features = [],
}: ComingSoonPageProps) {
  return (
    <div>
      <Header title={title} subtitle={subtitle} />

      <div className="p-6">
        <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            En desarrollo
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900">
            Esta seccion aun no tiene interfaz final.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            La ruta ya esta activa para evitar errores 404. Aqui puedes ir
            montando la version completa sin romper la navegacion del panel.
          </p>

          {features.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {feature}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
