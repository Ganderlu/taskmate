"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Plus,
  Users,
  MoreHorizontal,
  X,
  Bell,
  Settings,
  Cloud,
  HardDrive,
  MessageSquare,
  Shield,
  UserPlus,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isActive = (path: string) =>
    pathname === path || (path !== "/dashboard" && pathname?.startsWith(path));

  const moreItems = [
    {
      group: "Workspace",
      items: [
        {
          label: "Notifications",
          href: "/dashboard/notifications",
          icon: Bell,
          gradient: "from-rose-500 to-pink-500",
          badgeBg: "bg-rose-50 dark:bg-rose-900/25",
        },
      ],
    },
    {
      group: "Team & Access",
      items: [
        {
          label: "Team Permissions",
          href: "/dashboard/teams/edit",
          icon: Shield,
          gradient: "from-amber-500 to-orange-500",
          badgeBg: "bg-amber-50 dark:bg-amber-900/25",
        },
        {
          label: "Invite a Friend",
          href: "/dashboard/invite",
          icon: UserPlus,
          gradient: "from-emerald-500 to-teal-500",
          badgeBg: "bg-emerald-50 dark:bg-emerald-900/25",
        },
      ],
    },
    {
      group: "Resources",
      items: [
        {
          label: "Saved to Cloud",
          href: "/dashboard/cloud",
          icon: Cloud,
          gradient: "from-sky-500 to-blue-500",
          badgeBg: "bg-sky-50 dark:bg-sky-900/25",
        },
        {
          label: "Storage & Data",
          href: "/dashboard/storage",
          icon: HardDrive,
          gradient: "from-indigo-500 to-violet-500",
          badgeBg: "bg-indigo-50 dark:bg-indigo-900/25",
        },
      ],
    },
    {
      group: "Account",
      items: [
        {
          label: "Help & Feedback",
          href: "/dashboard/feedback",
          icon: MessageSquare,
          gradient: "from-fuchsia-500 to-pink-500",
          badgeBg: "bg-fuchsia-50 dark:bg-fuchsia-900/25",
        },
        {
          label: "Privacy & Terms",
          href: "/dashboard/privacy",
          icon: Shield,
          gradient: "from-slate-500 to-gray-600",
          badgeBg: "bg-slate-50 dark:bg-slate-900/25",
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          gradient: "from-violet-500 to-purple-600",
          badgeBg: "bg-violet-50 dark:bg-violet-900/25",
        },
      ],
    },
  ];

  useEffect(() => {
    if (showMoreSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMoreSheet]);

  return (
    <>
      {/* ===== Bottom Navigation Bar (mobile only) ===== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
          border-t border-gray-200/70 dark:border-gray-800/70
          shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.5)]
          safe-area-bottom"
      >
        <div className="relative max-w-md mx-auto px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-5 items-end gap-1">
            {/* 1. Dashboard */}
            <NavButton
              href="/dashboard"
              icon={LayoutDashboard}
              label="Home"
              active={
                isActive("/dashboard") &&
                !isActive("/dashboard/tasks") &&
                !isActive("/dashboard/teams")
              }
            />

            {/* 2. My Tasks */}
            <NavButton
              href="/dashboard/tasks"
              icon={CheckSquare}
              label="Tasks"
              active={isActive("/dashboard/tasks")}
            />

            {/* 3. CENTER FAB - Add Task */}
            <div className="flex justify-center -mt-7">
              <button
                onClick={() => router.push("/dashboard/tasks/new")}
                className="group relative w-14 h-14 rounded-2xl
                  bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600
                  shadow-[0_8px_24px_-4px_rgba(139,92,246,0.55)]
                  hover:shadow-[0_12px_30px_-4px_rgba(139,92,246,0.7)]
                  hover:-translate-y-1 active:scale-95
                  transition-all duration-200
                  flex items-center justify-center
                  ring-[3px] ring-white dark:ring-gray-900"
                aria-label="Add new task"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus
                  size={26}
                  strokeWidth={2.75}
                  className="text-white relative z-10 drop-shadow-sm"
                />
              </button>
            </div>

            {/* 4. My Team */}
            <NavButton
              href="/dashboard/teams"
              icon={Users}
              label="Team"
              active={
                isActive("/dashboard/teams") || isActive("/dashboard/team")
              }
            />

            {/* 5. More (opens sheet) */}
            <button
              onClick={() => setShowMoreSheet(true)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl
                transition-all duration-200 group"
              aria-label="More pages"
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  showMoreSheet
                    ? "bg-violet-100 dark:bg-violet-900/35 scale-110"
                    : "group-hover:bg-gray-100 dark:group-hover:bg-gray-800/60"
                }`}
              >
                <MoreHorizontal
                  size={20}
                  className={`transition-colors ${
                    showMoreSheet
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                  }`}
                />
              </div>
              <span
                className={`text-[9.5px] font-bold leading-none transition-colors ${
                  showMoreSheet
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                }`}
              >
                More
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== More Sheet Overlay ===== */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          showMoreSheet ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          onClick={() => setShowMoreSheet(false)}
        />

        {/* Sheet Panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 max-w-md mx-auto
            bg-white dark:bg-gray-900 rounded-t-[28px]
            shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)]
            transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${showMoreSheet ? "translate-y-0" : "translate-y-full"}
            overflow-hidden`}
        >
          {/* Grab handle */}
          <div className="flex justify-center pt-3 pb-1.5">
            <div className="w-10 h-1 rounded-full bg-gray-300/80 dark:bg-gray-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-[15px] leading-tight">
                  More
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  All pages & tools
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMoreSheet(false)}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* List */}
          <div
            className="max-h-[60vh] overflow-y-auto px-2 pb-[max(14px,env(safe-area-inset-bottom))]"
            style={{ scrollbarWidth: "none" }}
          >
            {moreItems.map((group) => (
              <div key={group.group} className="mb-2 last:mb-0">
                <div className="px-3 pt-2 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                    {group.group}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMoreSheet(false)}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl
                        hover:bg-gray-50 dark:hover:bg-gray-800/60
                        active:bg-gray-100 dark:active:bg-gray-800
                        transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center
                          ${item.badgeBg} group-hover:scale-105 transition-transform shrink-0`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm`}
                        >
                          <item.icon size={14} className="text-white" />
                        </div>
                      </div>
                      <span className="flex-1 text-[13.5px] font-semibold text-gray-800 dark:text-gray-100">
                        {item.label}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="px-3 pt-3 pb-1">
              <p className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-300 dark:text-gray-700">
                TaskMate AI · v1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ========== Individual Nav Button ========== */
function NavButton({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: any;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl
        transition-all duration-200 group"
    >
      <div
        className={`p-1.5 rounded-xl transition-all duration-200 ${
          active
            ? "bg-violet-100 dark:bg-violet-900/35 scale-110"
            : "group-hover:bg-gray-100 dark:group-hover:bg-gray-800/60"
        }`}
      >
        <Icon
          size={20}
          className={`transition-colors ${
            active
              ? "text-violet-600 dark:text-violet-400"
              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
          }`}
        />
      </div>
      <span
        className={`text-[9.5px] font-bold leading-none transition-colors ${
          active
            ? "text-violet-600 dark:text-violet-400"
            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
        }`}
      >
        {label}
      </span>
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
      )}
    </Link>
  );
}
