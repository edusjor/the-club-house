import Link from "@/i18n/Link";
import PublicShell from "@/components/public/PublicShell";
import {
  AlertTriangle,
  Baby,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldAlert,
  ShoppingCart,
  UtensilsCrossed,
  Users,
} from "lucide-react";

// Guide content is intentionally English-only regardless of the active
// locale — it's a fixed reference doc, not translated UI copy.
type Section = {
  id: string;
  icon: React.ElementType;
  title: string;
  path: string;
  intro: string;
  body: React.ReactNode;
};

const sections: Section[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "My Dashboard",
    path: "/parent/dashboard",
    intro: "The screen you land on after signing in — a quick snapshot of what needs your attention today.",
    body: (
      <ul className="space-y-2 text-sm text-slate-600">
        <li>• Your current <b className="text-slate-900">pending balance</b> and any alerts on your orders.</li>
        <li>• Shortcuts straight to Plan, Packages, and Balance.</li>
        <li>• A summary of active packages and recent consumption.</li>
      </ul>
    ),
  },
  {
    id: "children",
    icon: Baby,
    title: "My Children",
    path: "/parent/children",
    intro: "Register each child here before you can order food or buy a package for them.",
    body: (
      <>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Tap <b className="text-slate-900">Add Child</b> and enter their name, school level, and any <b className="text-slate-900">allergies or restrictions</b> — kitchen staff see these before handing over food.</li>
          <li>• Edit a child&apos;s details anytime with the pencil icon on their card.</li>
          <li>• An <b className="text-slate-900">inactive</b> child can&apos;t be selected for orders or packages.</li>
        </ul>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-800">
          <BriefcaseBusiness className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span><b>If you&apos;re staff:</b> your own profile shows as a banner here instead of a child card — nothing to set up, it&apos;s ready to order for right away.</span>
        </div>
      </>
    ),
  },
  {
    id: "menu",
    icon: UtensilsCrossed,
    title: "Menu",
    path: "/parent/menu",
    intro: "A browse-only catalog — see what's available and its price before you commit to ordering.",
    body: (
      <>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Organized into tabs: <b className="text-slate-900">General</b>, <b className="text-slate-900">Drinks</b>, and <b className="text-slate-900">Casados</b> (the daily special, with a photo from the monthly menu).</li>
          <li>• Prices vary by each child&apos;s <b className="text-slate-900">school level</b>.</li>
          <li>• Dishes are flagged when they&apos;re <b className="text-slate-900">gluten-free</b>, <b className="text-slate-900">lactose-free</b>, or <b className="text-slate-900">vegetarian</b>.</li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">To actually order, use <b className="text-slate-900">Plan</b> below — that&apos;s where items go into a cart.</p>
      </>
    ),
  },
  {
    id: "plan",
    icon: ShoppingCart,
    title: "Place an Order",
    path: "/parent/plan",
    intro: "The screen you'll use most. Build a food order for today or tomorrow.",
    body: (
      <>
        <ol className="space-y-2.5 text-sm text-slate-700">
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">1</span><span><b>Choose who it&apos;s for</b> — a child, or your own profile if you&apos;re staff. Prices adjust automatically to their level.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">2</span><span><b>Search or filter</b> dishes by tab (General, Drinks, Casados) and add them with the <em>Add</em> button.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">3</span><span><b>Pick the meal moment</b>: Break, Lunch, or Afterschool, for today or tomorrow. If a dish is the day&apos;s special, the moment locks in automatically.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">4</span><span>Tap <b>Add Line</b> to save that group of dishes to the cart — repeat for another child or another meal moment.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">5</span><span>Review the cart on the right (or the floating cart icon on mobile) and tap <b>Submit Order</b>.</span></li>
        </ol>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Orders are added to your <b>pending balance</b> — you don&apos;t pay at checkout. Settle up afterward from <b>Balance</b>.</span>
        </div>
      </>
    ),
  },
  {
    id: "packages",
    icon: Package,
    title: "Packages",
    path: "/parent/packages",
    intro: "Buy a block of meals up front (weekly, monthly, etc.) instead of paying dish by dish.",
    body: (
      <ul className="space-y-2 text-sm text-slate-600">
        <li>• Pick the <b className="text-slate-900">child</b>, the <b className="text-slate-900">package</b> available for their level, and a <b className="text-slate-900">start date</b>, then tap <b className="text-slate-900">Buy Package</b>.</li>
        <li>• Below that, each active package shows how much has been <b className="text-slate-900">consumed</b> and its valid date range.</li>
        <li>• When staff log a consumption covered by the package, that dish isn&apos;t charged separately.</li>
      </ul>
    ),
  },
  {
    id: "history",
    icon: History,
    title: "History",
    path: "/parent/history",
    intro: "Every order you've placed, with its live status.",
    body: (
      <>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Pending</span> — received but not yet in prep.</li>
          <li>• <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Preparing</span> — the kitchen has accepted it.</li>
          <li>• <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Delivered</span> — the student already received it.</li>
        </ul>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>If an order can still be cancelled, you&apos;ll see a <b>Cancel</b> button next to it — it disappears once the cutoff passes.</span>
        </div>
      </>
    ),
  },
  {
    id: "balance",
    icon: CreditCard,
    title: "Balance & Payments",
    path: "/parent/balance",
    intro: "Settle what you owe for orders and packages, by SINPE Móvil.",
    body: (
      <>
        <ol className="space-y-2.5 text-sm text-slate-700">
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">1</span><span>Check your <b>pending balance</b> at the top.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">2</span><span>Enter the <b>amount</b> you&apos;re paying (or keep the suggested total) and the <b>SINPE reference number</b>.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">3</span><span><b>Upload the receipt</b> — a photo or PDF, up to 4 MB.</span></li>
          <li className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-bold text-white">4</span><span>Tap <b>Send Payment</b>. It's marked <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Pending</span> until admin reviews it.</span></li>
        </ol>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Your pending balance only goes down once a payment is <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Approved</span>. Track every payment&apos;s status under the Pending / Approved / Rejected tabs.</span>
        </div>
      </>
    ),
  },
];

export default function GuidePage() {
  return (
    <PublicShell>
      <div className="bg-slate-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-cyan-900 px-4 py-14 text-center text-white sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">The Club House</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Quick Guide</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            For families and staff — how to order food, buy packages, and pay your balance.
          </p>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          {/* Sign-in box */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
            <span className="text-slate-500">Sign in at</span>
            <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
              theclubhousecr.com/login
            </Link>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">Switch language anytime from the sidebar footer.</span>
          </div>

          {/* Family vs staff lanes */}
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-cyan-700">
                <Users className="h-3.5 w-3.5" /> Family Account
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                One sign-in for all your children. Add them under <b className="text-slate-900">My Children</b>, then order or buy packages for each one separately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 border-t-4 border-t-violet-500 bg-white p-4 shadow-sm">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">
                <BriefcaseBusiness className="h-3.5 w-3.5" /> Staff Account
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                You use the same portal, but instead of a list of children you&apos;ll see your own profile marked <b className="text-slate-900">Staff</b>. Order directly for yourself in <b className="text-slate-900">Plan</b>.
              </p>
            </div>
          </div>

          {/* Table of contents */}
          <div className="mb-10 flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-cyan-300 hover:text-cyan-700"
              >
                {section.title}
              </a>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} id={section.id} className="scroll-mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                    </div>
                    <code className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-400 sm:block">
                      {section.path}
                    </code>
                  </div>
                  <p className="mb-3 text-sm text-slate-500">{section.intro}</p>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {section.body}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Good to know */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> Allergies &amp; restrictions
              </p>
              <p className="text-xs text-slate-500">Add them on each child&apos;s profile — kitchen staff see them before handing over food.</p>
            </div>
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Calendar className="h-4 w-4 text-amber-600" /> One order per meal
              </p>
              <p className="text-xs text-slate-500">Each cart line is for one child and one meal moment (break, lunch, or afterschool).</p>
            </div>
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <LayoutDashboard className="h-4 w-4 text-amber-600" /> Platform language
              </p>
              <p className="text-xs text-slate-500">Switch between English and Spanish from the 🌐 selector at the bottom of the sidebar, anytime.</p>
            </div>
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <LogOut className="h-4 w-4 text-amber-600" /> Signing out
              </p>
              <p className="text-xs text-slate-500">The Sign Out button sits at the bottom of the sidebar, under your name and email.</p>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-slate-400">
            Questions about an order or payment? Contact administration from inside the platform.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
