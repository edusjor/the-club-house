import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  Leaf,
  Shield,
  Clock,
  UtensilsCrossed,
  Users,
  Package,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "Ingredientes Frescos",
    desc: "Seleccionados diariamente de proveedores locales de confianza.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: ChefHat,
    title: "Chefs Expertos",
    desc: "Personal capacitado con conocimiento en nutrición infantil.",
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    icon: Clock,
    title: "Puntual y Rápido",
    desc: "Entrega en tiempo, cada vez, sin excusas.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: Shield,
    title: "100% Calidad",
    desc: "Higiene y calidad garantizada en cada preparación.",
    color: "bg-violet-100 text-violet-600",
  },
];

const benefits = [
  "Planifica las comidas de tus hijos semanalmente",
  "Paga cómodamente por SINPE Móvil",
  "Recibe alertas de alergias y restricciones",
  "Consulta historial de consumo en tiempo real",
  "Compra paquetes mensuales o anuales con descuento",
  "Administra múltiples hijos desde un solo perfil",
];

const menuHighlights = [
  {
    name: "Bowl de Pollo a la Plancha",
    category: "Almuerzo",
    level: "Primaria",
    price: "₡3,500",
    tags: ["Saludable", "Sin gluten"],
    emoji: "🍗",
    bg: "bg-cyan-50",
  },
  {
    name: "Pancakes con Frutas",
    category: "Desayuno",
    level: "Preescolar",
    price: "₡2,400",
    tags: ["Vegetariano", "Saludable"],
    emoji: "🥞",
    bg: "bg-emerald-50",
  },
  {
    name: "Smoothie de Mango",
    category: "Bebida",
    level: "Todos",
    price: "₡1,000",
    tags: ["Natural", "Sin azúcar añadida"],
    emoji: "🥭",
    bg: "bg-yellow-50",
  },
  {
    name: "Bowl de Pasta Boloñesa",
    category: "Almuerzo",
    level: "Secundaria",
    price: "₡3,500",
    tags: ["Proteína alta"],
    emoji: "🍝",
    bg: "bg-orange-50",
  },
];

const stats = [
  { value: "500+", label: "Estudiantes activos" },
  { value: "4.9★", label: "Calificación promedio" },
  { value: "15+", label: "Opciones de menú diario" },
  { value: "3", label: "Niveles escolares" },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/25 border border-cyan-300/45 rounded-full text-cyan-100 text-xs font-semibold mb-6">
                <Leaf className="w-3.5 h-3.5" />
                Alimentación Escolar Saludable
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
                Comida{" "}
                <span className="text-cyan-400">saludable</span>{" "}
                para tus hijos
              </h1>
              <p className="text-slate-200 text-lg leading-relaxed mb-8 max-w-lg">
                Gestiona las comidas de tus hijos fácilmente. Menú fresco,
                paquetes flexibles y pagos simples desde un solo lugar.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
                >
                  Ver Menú
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors backdrop-blur-sm"
                >
                  Iniciar Sesión
                </Link>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/10">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-black text-cyan-400">{s.value}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {menuHighlights.map((item) => (
                <div
                  key={item.name}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-colors"
                >
                  <div className="text-4xl mb-3">{item.emoji}</div>
                  <p className="font-bold text-white text-sm leading-tight mb-1">
                    {item.name}
                  </p>
                  <p className="text-cyan-200 text-xs mb-2">{item.category} · {item.level}</p>
                  <p className="text-white font-black text-lg">{item.price}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded-full font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-cyan-600 font-semibold text-sm uppercase tracking-wider mb-2">
              ¿Por qué elegirnos?
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Calidad en cada comida
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-slate-100 text-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${f.color}`}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu preview */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-cyan-600 font-semibold text-sm uppercase tracking-wider mb-2">
                Nuestro menú
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Platillos más populares
              </h2>
            </div>
            <Link
              href="/menu"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
            >
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {menuHighlights.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 transition-all hover:-translate-y-0.5 group"
              >
                <div
                  className={`h-40 flex items-center justify-center text-6xl ${item.bg} group-hover:scale-105 transition-transform`}
                >
                  {item.emoji}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500">{item.level}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2 leading-tight">
                    {item.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900">{item.price}</p>
                    <Link
                      href="/login"
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Pedir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal benefits */}
      <section className="py-16 bg-gradient-to-br from-cyan-600 to-cyan-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-cyan-200 font-semibold text-sm uppercase tracking-wider mb-3">
                Portal de Padres
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
                Todo el control de la alimentación de tus hijos
              </h2>
              <p className="text-cyan-50 text-lg leading-relaxed mb-8">
                Con el Portal de Padres de The Club House tienes visibilidad
                completa sobre lo que comen tus hijos, sus pagos y paquetes
                activos.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-cyan-700 font-bold rounded-xl hover:bg-cyan-50 transition-colors"
              >
                Acceder al Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {benefits.map((b) => (
                <div
                  key={b}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3"
                >
                  <CheckCircle className="w-5 h-5 text-cyan-200 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white font-medium">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Panels overview */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              Paneles según tu rol
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Cada usuario tiene acceso a un panel personalizado con las
              herramientas que necesita.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Administrador",
                desc: "Gestiona usuarios, menú, paquetes, pagos y reportes completos del sistema.",
                color: "bg-purple-100 text-purple-600",
                href: "/admin/dashboard",
              },
              {
                icon: UtensilsCrossed,
                title: "Padre / Madre",
                desc: "Consulta el menú, planifica comidas, compra paquetes y realiza pagos por SINPE Móvil.",
                color: "bg-cyan-100 text-cyan-600",
                href: "/parent/dashboard",
              },
              {
                icon: Package,
                title: "Vendedor",
                desc: "Registra consumos, gestiona pedidos del día y valida paquetes activos de estudiantes.",
                color: "bg-orange-100 text-orange-600",
                href: "/vendor/dashboard",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-2xl p-6 border border-slate-100"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${p.color}`}
                >
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  {p.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {p.desc}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                >
                  Acceder <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            ¿Listo para comenzar?
          </h2>
          <p className="text-slate-200 text-lg mb-8">
            Comidas saludables, pagos simples y control total en tus manos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl transition-colors"
          >
            Iniciar Sesión en mi Portal
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

