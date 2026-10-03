"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  Eye,
  Database,
  User,
  Server,
  Trash2,
  FileCheck,
  Mail,
  Key,
  Globe,
  Share2,
  Clock,
  BadgeCheck,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Smartphone,
} from "lucide-react";

const LAST_UPDATED = "October 3, 2026";

const PRINCIPLES = [
  {
    icon: Eye,
    title: "We only collect what we need",
    desc: "TaskMate collects only the minimum data required to run your workspace — tasks, teams, profile, and login credentials.",
    gradient: "from-violet-500 to-indigo-600",
    bg: "bg-violet-50 dark:bg-violet-900/25",
  },
  {
    icon: Lock,
    title: "Your data is encrypted in transit",
    desc: "All connections use TLS 1.2+ and Firebase-provided security rules enforce per-user access to your tasks and teams.",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/25",
  },
  {
    icon: Share2,
    title: "We never sell your data",
    desc: "TaskMate does not sell, rent, or share personal data with third-party advertisers — ever.",
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50 dark:bg-rose-900/25",
  },
  {
    icon: Key,
    title: "You own your data",
    desc: "You can export, edit, or permanently delete your account and all associated content at any time from Settings.",
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50 dark:bg-sky-900/25",
  },
];

const DATA_CATEGORIES = [
  {
    icon: User,
    label: "Account Data",
    examples: ["Name", "Email", "Profile photo", "Password hash"],
    purpose: "Account creation, login, and personalization",
    retention: "While account is active + 30 days",
  },
  {
    icon: Database,
    label: "Workspace Data",
    examples: [
      "Tasks (title, dates, status)",
      "Categories & labels",
      "Teams & members",
    ],
    purpose: "Core product — task management & collaboration",
    retention: "While account is active + 30 days",
  },
  {
    icon: Server,
    label: "Usage Analytics",
    examples: ["Page visits", "Errors", "Device info"],
    purpose: "Quality, performance, and bug fixes (aggregate)",
    retention: "24 months, then aggregated",
  },
  {
    icon: Mail,
    label: "Communication",
    examples: ["Invite emails", "Support tickets", "Announcements"],
    purpose: "Responding to inquiries & account updates",
    retention: "5 years for compliance",
  },
];

const RIGHTS = [
  {
    icon: Eye,
    title: "Right of access",
    desc: "Request a copy of all personal data associated with your account, in a machine-readable format.",
  },
  {
    icon: FileCheck,
    title: "Right to rectification",
    desc: "Update inaccurate or incomplete information through Settings or by contacting support.",
  },
  {
    icon: Trash2,
    title: "Right to erasure",
    desc: "Request permanent deletion of your account and all personal data. Subject to legal obligations.",
  },
  {
    icon: Lock,
    title: "Right to restrict processing",
    desc: "Limit how we process your data under specific conditions defined in GDPR / CCPA.",
  },
  {
    icon: Globe,
    title: "Right to portability",
    desc: "Export your data in a structured JSON format via Settings → Export Data.",
  },
  {
    icon: BadgeCheck,
    title: "Right to lodge a complaint",
    desc: "File a complaint with your local data protection authority at any time.",
  },
];

const FAQ = [
  {
    q: "Where is my data hosted?",
    a: "TaskMate uses Google Firebase (Firestore, Cloud Storage, Auth) with data hosted in the multi-region us-central (United States). All network traffic is encrypted in transit with TLS 1.2 or newer.",
  },
  {
    q: "Do you share my data with 3rd parties?",
    a: "Only with vetted subprocessors required to run the service (Google Cloud for Firebase, Cloudinary for email assets). We never sell or license user data for advertising.",
  },
  {
    q: "Can minors use TaskMate?",
    a: "TaskMate is intended for users aged 13 and older, and we do not knowingly collect personal information from children under 13. If you believe a child has registered, contact privacy@taskmate.ai.",
  },
  {
    q: "How do I delete my account?",
    a: "Navigate to Settings → Account → Delete Account. This permanently deletes your tasks, teams, and profile after a 7-day grace period in case you change your mind.",
  },
  {
    q: "Will this policy change?",
    a: "We may update this policy from time to time to reflect product changes or legal requirements. Material changes will be announced via email or in-app banner 30 days before taking effect.",
  },
];

export default function PrivacyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const contactEmail = "privacy@taskmate.ai";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${contactEmail}`;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-14">
      {/* HERO */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-7 sm:p-10 text-white shadow-2xl shadow-violet-500/25">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/15 shadow-2xl">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold uppercase tracking-[0.14em] mb-3 backdrop-blur">
              <Clock size={11} />
              Last updated {LAST_UPDATED}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-2">
              Privacy & Data Protection
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl">
              Your trust is our foundation. This page explains what data TaskMate AI
              collects, how it&apos;s used, and the control you have over it.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          <QuickStat value="TLS 1.2+" label="In-transit encryption" />
          <QuickStat value="99.95%" label="Uptime SLA target" />
          <QuickStat value="Zero" label="Data sold / ads" />
          <QuickStat value="GDPR · CCPA" label="Compliance ready" />
        </div>
      </header>

      {/* PRINCIPLES */}
      <section>
        <SectionHeader
          eyebrow="Core Principles"
          title="How we think about privacy"
          desc="Four non-negotiable commitments that guide every product decision at TaskMate."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-6">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className="group relative p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${p.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${p.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon
                    size={24}
                    className={`sm:w-[26px] sm:h-[26px] bg-gradient-to-br ${p.gradient} text-transparent`}
                    style={{
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mb-1.5 tracking-tight">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* DATA CATEGORIES */}
      <section>
        <SectionHeader
          eyebrow="Data Transparency"
          title="What we store & why"
          desc="A complete inventory of data categories, what we store in each, and how long we keep it."
        />
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 bg-gray-50/60 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-4 w-[22%]">Category</th>
                  <th className="text-left px-6 py-4 w-[30%]">Examples</th>
                  <th className="text-left px-6 py-4 w-[28%]">Purpose</th>
                  <th className="text-left px-6 py-4 w-[20%]">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {DATA_CATEGORIES.map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <tr
                      key={i}
                      className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/25 flex items-center justify-center shrink-0">
                            <Icon
                              size={17}
                              className="text-violet-600 dark:text-violet-400"
                            />
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {row.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {row.examples.map((ex, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-600 dark:text-gray-400">
                        {row.purpose}
                      </td>
                      <td className="px-6 py-4 align-top font-semibold text-gray-700 dark:text-gray-300 text-xs">
                        {row.retention}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {DATA_CATEGORIES.map((row, i) => {
              const Icon = row.icon;
              return (
                <div key={i} className="p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/25 flex items-center justify-center shrink-0">
                      <Icon
                        size={17}
                        className="text-violet-600 dark:text-violet-400"
                      />
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">
                      {row.label}
                    </span>
                  </div>
                  <div className="pl-[46px] space-y-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Purpose
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        {row.purpose}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Examples
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {row.examples.map((ex, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Retention
                      </span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                        {row.retention}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* USER RIGHTS */}
      <section>
        <SectionHeader
          eyebrow="Your Rights"
          title="GDPR & CCPA-aligned controls"
          desc="You have meaningful control over your data at every step."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {RIGHTS.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-900/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center mb-3.5 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/25 transition-colors">
                  <Icon
                    size={19}
                    className="text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors"
                  />
                </div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-[15px] mb-1.5 tracking-tight">
                  {r.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECURITY */}
      <section>
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-900/10 dark:via-gray-900 dark:to-sky-900/10 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-200/40 dark:bg-emerald-500/10 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-[0.14em] mb-3">
                <BadgeCheck size={11} /> Security in practice
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2.5">
                Built on a secure foundation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
                TaskMate inherits Google Cloud&apos;s industry-leading security and
                uses Firebase&apos;s server-side security rules so users can only
                access documents they own.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Firebase Auth password hashing (scrypt with unique salt)",
                  "OAuth login via Google (no password required)",
                  "Per-document Firestore security rules",
                  "Cloudinary for permanent CDN-hosted email assets",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-500/20">
                      <Check
                        size={11}
                        className="text-white font-extrabold"
                      />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              <SecurityBadge
                icon={Lock}
                label="Encrypted"
                sub="In transit & at rest"
                color="emerald"
              />
              <SecurityBadge
                icon={Smartphone}
                label="2FA Ready"
                sub="Via Google OAuth"
                color="violet"
              />
              <SecurityBadge
                icon={Server}
                label="SOC 2 Host"
                sub="Google Cloud"
                color="sky"
              />
              <SecurityBadge
                icon={AlertTriangle}
                label="Zero Logs"
                sub="No ad tracking"
                color="amber"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionHeader
          eyebrow="FAQ"
          title="Common questions"
          desc="Can&apos;t find what you&apos;re looking for? Email our Data Protection Officer anytime."
        />
        <div className="mt-6 space-y-2.5">
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <button
                key={i}
                onClick={() => setOpenFaq(open ? null : i)}
                className={`group w-full text-left p-5 rounded-2xl border transition-all duration-200 ${
                  open
                    ? "bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-900/50 shadow-md shadow-violet-500/5"
                    : "bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3
                    className={`text-sm sm:text-base font-extrabold tracking-tight ${
                      open
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {f.q}
                  </h3>
                  <ChevronRight
                    size={18}
                    className={`text-gray-400 transition-transform shrink-0 ${
                      open ? "rotate-90 text-violet-500" : ""
                    }`}
                  />
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    open ? "max-h-[400px] mt-3 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                    {f.a}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CONTACT CTA */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 dark:bg-gradient-to-br dark:from-gray-900 dark:via-violet-950/30 dark:to-indigo-950/40 p-7 sm:p-10 text-white border border-gray-800">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
                Questions or Data Subject Requests?
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
                Reach out to our Data Protection Officer at{" "}
                <code className="font-mono text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded-md text-[13px]">
                  {contactEmail}
                </code>{" "}
                — we respond within 48 hours on business days.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 sm:justify-end">
              <button
                onClick={copyEmail}
                className="inline-flex items-center gap-2 px-4 py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-lg shadow-black/20"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-600" />
                ) : (
                  <Copy size={16} />
                )}
                {copied ? "Copied!" : "Copy email"}
              </button>
              <a
                href={`mailto:${contactEmail}?subject=Privacy%20Request`}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-500/30"
              >
                <Mail size={16} />
                Send email
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTNOTE */}
      <footer className="text-center text-xs text-gray-400 dark:text-gray-500 space-y-1 pt-4 border-t border-gray-100 dark:border-gray-800">
        <p>
          © {new Date().getFullYear()} TaskMate AI — Privacy Policy version 1.1
        </p>
        <p className="max-w-2xl mx-auto leading-relaxed">
          This policy is a public, human-readable summary of our data practices.
          While it is not a legal contract, it accurately reflects our Data
          Processing Agreement and your rights. For the full legal text, contact
          privacy@taskmate.ai.
        </p>
      </footer>
    </div>
  );
}

/* ========== Subcomponents ========== */

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        {eyebrow}
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {title}
      </h2>
      <p className="text-sm sm:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
        {desc}
      </p>
    </div>
  );
}

function QuickStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-3 hover:bg-white/15 transition-colors">
      <p className="text-lg sm:text-xl font-extrabold tracking-tight">
        {value}
      </p>
      <p className="text-[10px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider leading-tight">
        {label}
      </p>
    </div>
  );
}

function SecurityBadge({
  icon: Icon,
  label,
  sub,
  color,
}: {
  icon: any;
  label: string;
  sub: string;
  color: "emerald" | "violet" | "sky" | "amber";
}) {
  const map = {
    emerald:
      "from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-200",
    violet:
      "from-violet-500/20 to-indigo-500/20 border-violet-400/40 text-violet-200",
    sky: "from-sky-500/20 to-blue-500/20 border-sky-400/40 text-sky-200",
    amber:
      "from-amber-500/20 to-orange-500/20 border-amber-400/40 text-amber-200",
  } as const;
  const classes = map[color];
  return (
    <div
      className={`relative rounded-2xl p-4 border bg-gradient-to-br ${classes} backdrop-blur-sm overflow-hidden`}
    >
      <Icon size={22} className="mb-2" />
      <p className="text-sm font-extrabold text-white">{label}</p>
      <p className="text-[10px] font-semibold opacity-80">{sub}</p>
    </div>
  );
}
