"use client";

import { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
  Sparkles,
  Flag,
  TrendingUp,
  FolderKanban,
  Target,
  Gauge,
  PlayCircle,
  Circle,
  Users,
  ChevronRight,
  Clock3,
  CalendarDays,
  Trophy,
  Zap,
  XCircle,
  BarChart3,
  Send,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

interface Task {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: "pending" | "completed" | "ongoing" | "cancelled";
  priority?: "low" | "medium" | "high";
  category?: string;
  description?: string;
  userId: string;
  deleted?: boolean;
  createdAt?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  color?: string;
  createdAt?: string;
}

function getTimeOfDayGreeting(): {
  greeting: string;
  emoji: string;
  message: string;
} {
  const hour = dayjs().hour();
  if (hour < 5)
    return {
      greeting: "Good Night",
      emoji: "🌙",
      message: "Still working late? Great dedication!",
    };
  if (hour < 12)
    return {
      greeting: "Good Morning",
      emoji: "☀️",
      message: "A fresh start. Let's be productive today!",
    };
  if (hour < 17)
    return {
      greeting: "Good Afternoon",
      emoji: "🌤️",
      message: "Halfway there. Keep the momentum going!",
    };
  if (hour < 21)
    return {
      greeting: "Good Evening",
      emoji: "🌆",
      message: "Finishing strong today. Nice work!",
    };
  return {
    greeting: "Good Night",
    emoji: "🌙",
    message: "Rest up for another great day tomorrow.",
  };
}

const PRIORITY_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  high: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    border: "border-red-200 dark:border-red-900/50",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  low: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-900/50",
  },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; icon: any; label: string }
> = {
  completed: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    icon: CheckCircle2,
    label: "Completed",
  },
  ongoing: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: PlayCircle,
    label: "In Progress",
  },
  pending: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    icon: Circle,
    label: "Pending",
  },
  cancelled: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
    icon: XCircle,
    label: "Cancelled",
  },
};

const PROJECT_COLORS = [
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("User");
  const [userInitial, setUserInitial] = useState("U");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tasks data
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  const today = dayjs().format("YYYY-MM-DD");
  const greetingInfo = getTimeOfDayGreeting();

  // Fetch everything
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const dn =
          user.displayName || (user.email ? user.email.split("@")[0] : "User");
        setUserName(dn);
        setUserInitial(dn.charAt(0).toUpperCase());
        await Promise.all([fetchAllTasks(user.uid), fetchProjects(user.uid)]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAllTasks = async (userId: string) => {
    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", userId),
        where("deleted", "==", false),
      );
      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Task,
      );
      setAllTasks(tasks);

      // Split into today + upcoming
      const tTasks = tasks
        .filter((t) => t.date === today)
        .sort((a, b) =>
          (a.startTime || "99:99").localeCompare(b.startTime || "99:99"),
        );
      setTodayTasks(tTasks);

      const uTasks = tasks
        .filter(
          (t) =>
            dayjs(t.date).isAfter(today, "day") && t.status !== "completed",
        )
        .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
        .slice(0, 6);
      setUpcomingTasks(uTasks);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      if (
        err?.code === "permission-denied" ||
        err?.message?.includes("permissions")
      ) {
        setError(
          "Firebase permissions not configured. Please deploy firestore.rules to your Firebase project.",
        );
      }
    }
  };

  const fetchProjects = async (userId: string) => {
    try {
      const q = query(
        collection(db, "projects"),
        where("userId", "==", userId),
        limit(5),
      );
      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map((d, i) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          status: data.status || "active",
          color: data.color || PROJECT_COLORS[i % PROJECT_COLORS.length],
        } as Project;
      });
      setRecentProjects(projects);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      if (
        err?.code === "permission-denied" ||
        err?.message?.includes("permissions")
      ) {
        setError(
          "Firebase permissions not configured. Please deploy firestore.rules to your Firebase project.",
        );
      }
    }
  };

  // Computed Stats
  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === "completed").length;
    const ongoing = allTasks.filter((t) => t.status === "ongoing").length;
    const pending = allTasks.filter((t) => t.status === "pending").length;
    const highPriority = allTasks.filter(
      (t) => t.priority === "high" && t.status !== "completed",
    ).length;

    // Week stats
    const weekStartMs = dayjs().startOf("week").valueOf();
    const weekEndMs = dayjs().endOf("week").valueOf();
    const thisWeekTotal = allTasks.filter((t) => {
      const ms = dayjs(t.date).valueOf();
      return ms >= weekStartMs && ms <= weekEndMs;
    }).length;
    const thisWeekCompleted = allTasks.filter((t) => {
      const ms = dayjs(t.date).valueOf();
      return t.status === "completed" && ms >= weekStartMs && ms <= weekEndMs;
    }).length;

    // Today stats
    const todayCompleted = todayTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const todayTotal = todayTasks.length;
    const todayProgress =
      todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
    const overallProgress =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const weekProgress =
      thisWeekTotal > 0
        ? Math.round((thisWeekCompleted / thisWeekTotal) * 100)
        : 0;

    // Productivity score (weighted)
    let score = 0;
    if (todayProgress >= 80) score = 95;
    else if (todayProgress >= 60) score = 82;
    else if (todayProgress >= 40) score = 68;
    else if (todayProgress >= 20) score = 52;
    else score = 38;
    if (highPriority === 0 && todayTotal > 0) score = Math.min(100, score + 5);

    return {
      total,
      completed,
      ongoing,
      pending,
      highPriority,
      todayTotal,
      todayCompleted,
      todayProgress,
      thisWeekTotal,
      thisWeekCompleted,
      weekProgress,
      overallProgress,
      score,
    };
  }, [allTasks, todayTasks, today]);

  // Computed Distribution for the mini chart
  const distribution = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, "day");
      const dStr = d.format("YYYY-MM-DD");
      const dayTasks = allTasks.filter((t) => t.date === dStr);
      const completed = dayTasks.filter((t) => t.status === "completed").length;
      const total = dayTasks.length;
      last7Days.push({
        label: d.format("ddd").charAt(0),
        fullLabel: d.format("ddd"),
        completed,
        total,
        pct: total > 0 ? (completed / total) * 100 : 0,
      });
    }
    return last7Days;
  }, [allTasks]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
          <div className="absolute inset-0 blur-xl bg-purple-500/20 -z-10 rounded-full" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Preparing your dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-3">
            Unable to load dashboard
          </h2>
          <p className="text-red-700 dark:text-red-400 mb-6 leading-relaxed">
            {error}
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 text-left mb-6 border border-red-100 dark:border-red-900/40">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
              Deployment Instructions (run in terminal):
            </p>
            <pre className="text-xs bg-gray-900 dark:bg-black text-green-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
              {`# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login to your Firebase account
firebase login

# 3. Deploy Firestore Security Rules
firebase deploy --only firestore:rules

# 4. Deploy Composite Indexes (may take 5-10 min)
firebase deploy --only firestore:indexes`}
            </pre>
          </div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
          >
            <RotateCcw size={18} />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 md:pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 -mx-1 sm:mx-0">
      {/* ============================================ */}
      {/* MOBILE-OPTIMIZED HERO (app-style card)      */}
      {/* ============================================ */}
      <div className="relative overflow-hidden rounded-[28px] md:rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-4 py-5 md:p-8 text-white shadow-xl shadow-purple-500/25 md:shadow-2xl">
        {/* Decorative blobs (mobile-tuned sizes) */}
        <div className="absolute -top-16 md:-top-24 -right-12 md:-right-24 w-56 md:w-72 h-56 md:h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 md:-bottom-24 -left-10 md:-left-24 w-60 md:w-72 h-60 md:h-72 bg-indigo-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="hidden md:block absolute top-10 right-32 w-20 h-20 bg-white/5 rounded-full border border-white/10" />
        <div className="hidden md:block absolute bottom-10 right-16 w-12 h-12 bg-white/5 rounded-full border border-white/10" />

        <div className="relative z-10 space-y-4 md:space-y-0 md:flex md:flex-row md:items-center md:justify-between md:gap-6">
          {/* ===== MOBILE TOP ROW: Date + Emoji ===== */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-[14px] bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                <span>{greetingInfo.emoji}</span>
              </div>
              <div>
                <p className="text-white/75 text-[11px] font-semibold uppercase tracking-[0.04em] leading-none">
                  {dayjs().format("ddd")}
                </p>
                <p className="text-white text-sm font-bold leading-tight">
                  {dayjs().format("MMM D, YYYY")}
                </p>
              </div>
            </div>
            {/* Mobile-only tiny score chip */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-white/12 backdrop-blur border border-white/15">
              <div className="relative w-6 h-6 -rotate-90">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    className="stroke-white/20"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.score}, 100`}
                  />
                </svg>
              </div>
              <span className="text-[11px] font-extrabold tracking-tight">
                {stats.score}
              </span>
            </div>
          </div>

          {/* ===== MOBILE GREETING BLOCK ===== */}
          <div className="md:hidden space-y-3">
            <div className="min-w-0">
              <h1 className="text-[26px] leading-[1.1] font-extrabold tracking-tight">
                {greetingInfo.greeting},
              </h1>
              <h2 className="text-[28px] leading-[1.1] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
                {userName}
              </h2>
            </div>
            <p className="text-white/80 text-[13px] leading-snug">
              {greetingInfo.message}
            </p>

            {/* Action buttons (mobile: big pill-style) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href="/dashboard/tasks/new"
                className="group flex items-center justify-center gap-1.5 bg-white text-violet-700 active:scale-[0.98] hover:bg-white/95 px-3 py-3 rounded-2xl font-extrabold shadow-[0_6px_16px_-6px_rgba(0,0,0,0.25)] transition-all text-sm"
              >
                <Plus size={19} strokeWidth={2.75} />
                New Task
              </Link>
              <Link
                href="/dashboard/projects"
                className="group flex items-center justify-center gap-1.5 bg-white/15 active:bg-white/25 backdrop-blur-sm border border-white/20 text-white active:scale-[0.98] px-3 py-3 rounded-2xl font-extrabold transition-all text-sm"
              >
                <FolderKanban size={18} />
                Projects
              </Link>
            </div>
          </div>

          {/* ===== DESKTOP HERO LAYOUT (unchanged) ===== */}
          <div className="hidden md:flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-4xl flex-shrink-0 shadow-inner">
              <span className="drop-shadow-lg">{greetingInfo.emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-2">
                <CalendarDays size={14} />
                {dayjs().format("dddd, MMMM D, YYYY")}
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                {greetingInfo.greeting},{" "}
                <span className="drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                  {userName}
                </span>
              </h1>
              <p className="text-white/80 text-base max-w-xl leading-relaxed">
                {greetingInfo.message}
              </p>
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-3 items-end">
            <div className="flex md:flex-row gap-3">
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-white/95 hover:scale-[1.02] px-5 py-3 rounded-2xl font-bold shadow-lg shadow-black/10 transition-all text-sm"
              >
                <Plus size={18} />
                New Task
              </Link>
              <Link
                href="/dashboard/projects"
                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white px-5 py-3 rounded-2xl font-bold transition-all text-sm"
              >
                <FolderKanban size={18} />
                Projects
              </Link>
            </div>

            <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    className="stroke-white/15"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.score}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-extrabold">
                    {stats.score}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap size={13} className="text-yellow-300" />
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wide">
                    Score
                  </span>
                </div>
                <p className="text-sm font-semibold leading-tight">
                  {stats.score >= 80
                    ? "Excellent"
                    : stats.score >= 60
                      ? "On Track"
                      : stats.score >= 40
                        ? "Getting There"
                        : "Needs Attention"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MOBILE PRODUCTIVITY SCORE CARD ===== */}
        <div className="md:hidden relative z-10 mt-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className="stroke-white/15"
                  strokeWidth="3.2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[19px] font-black leading-none">
                  {stats.score}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Zap size={12} className="text-yellow-300 drop-shadow" />
                <span className="text-[10.5px] font-extrabold text-white/80 uppercase tracking-[0.12em]">
                  Productivity Score
                </span>
              </div>
              <p className="text-[15px] font-bold leading-tight mb-1.5">
                {stats.score >= 80
                  ? "Excellent work! 🔥"
                  : stats.score >= 60
                    ? "On track, keep going 💪"
                    : stats.score >= 40
                      ? "Getting there, momentum builds ⚡"
                      : "Needs attention, let's start 🚀"}
              </p>
              {/* Mini progress chip row */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-white to-cyan-300"
                    style={{ width: `${stats.score}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-white/70 leading-none">
                  {stats.score}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* APP-STYLE STATS GRID (mobile: 2-col dense)  */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ListTodo}
          gradient="from-blue-500 to-cyan-500"
          lightBg="bg-blue-50 dark:bg-blue-900/20"
          sub={`${stats.overallProgress}% complete`}
          progress={stats.overallProgress}
        />
        <StatCard
          label="Today"
          value={`${stats.todayCompleted}/${stats.todayTotal}`}
          icon={Target}
          gradient="from-violet-500 to-purple-600"
          lightBg="bg-violet-50 dark:bg-violet-900/20"
          sub={`${stats.todayProgress}% done`}
          progress={stats.todayProgress}
        />
        <StatCard
          label="This Week"
          value={`${stats.thisWeekCompleted}/${stats.thisWeekTotal}`}
          icon={CalendarDays}
          gradient="from-green-500 to-emerald-500"
          lightBg="bg-green-50 dark:bg-green-900/20"
          sub={`${stats.weekProgress}% done`}
          progress={stats.weekProgress}
        />
        <StatCard
          label="In Progress"
          value={stats.ongoing}
          icon={PlayCircle}
          gradient="from-indigo-500 to-blue-600"
          lightBg="bg-indigo-50 dark:bg-indigo-900/20"
          sub="Active tasks"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          lightBg="bg-amber-50 dark:bg-amber-900/20"
          sub="Waiting"
        />
        <StatCard
          label="High Priority"
          value={stats.highPriority}
          icon={Flag}
          gradient="from-red-500 to-rose-500"
          lightBg="bg-red-50 dark:bg-red-900/20"
          sub="Attention"
          warning={stats.highPriority > 0}
        />
      </div>

      {/* ============================================ */}
      {/* MAIN SECTIONS (stacked on mobile)           */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* ======= LEFT STACK (spans 2 cols on lg) ======= */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* ============= TODAY'S SCHEDULE ============= */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 md:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] md:rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25 md:shadow-lg">
                  <Clock3 size={17} className="text-white md:hidden" />
                  <Clock3 size={19} className="text-white hidden md:block" />
                </div>
                <div>
                  <h2 className="text-[15px] md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                    Today's Schedule
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {todayTasks.length > 0
                      ? `${stats.todayCompleted} of ${todayTasks.length} done`
                      : `Nothing scheduled`}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 bg-violet-50 dark:bg-violet-900/25 hover:bg-violet-100 dark:hover:bg-violet-900/35 text-violet-600 dark:text-violet-400 rounded-[12px] md:rounded-xl font-bold text-[11.5px] md:text-sm transition-colors active:scale-[0.98]"
              >
                <Plus size={14} />
                <span className="md:inline">Add</span>
              </Link>
            </div>

            <div className="p-3 md:p-6 space-y-2 md:space-y-3 max-h-[460px] md:max-h-[420px] overflow-y-auto">
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 md:py-12 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-4 border border-violet-100 dark:border-violet-900/40">
                    <Calendar
                      size={30}
                      className="text-violet-400 dark:text-violet-500 md:hidden"
                    />
                    <Calendar
                      size={36}
                      className="text-violet-400 dark:text-violet-500 hidden md:block"
                    />
                  </div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white mb-1 md:mb-1.5 text-[15px] md:text-base">
                    Your day is wide open
                  </h3>
                  <p className="text-[12.5px] md:text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-[240px] md:max-w-sm leading-snug">
                    Plan your day. Start small and build momentum.
                  </p>
                  <Link
                    href="/dashboard/tasks/new"
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 md:px-5 py-2.5 md:py-2.5 rounded-2xl font-extrabold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 active:scale-[0.98] transition-all text-[13px] md:text-sm"
                  >
                    <Plus size={17} />
                    Schedule First Task
                  </Link>
                </div>
              ) : (
                todayTasks.map((task, idx) => {
                  const statusStyle =
                    STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                  const StatusIcon = statusStyle.icon;
                  const pStyle = PRIORITY_STYLES[task.priority || "low"];
                  const isDone = task.status === "completed";

                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/edit/${task.id}`}
                      className={`group relative flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-2xl md:rounded-2xl border transition-all active:scale-[0.995] ${
                        isDone
                          ? "bg-gray-50/50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 opacity-75"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800/60 hover:shadow-[0_4px_16px_-6px_rgba(139,92,246,0.25)]"
                      }`}
                    >
                      {idx !== todayTasks.length - 1 && (
                        <div className="absolute left-[30px] md:left-[34px] top-[52px] md:top-[56px] -bottom-2 w-px bg-gray-100 dark:bg-gray-800/70 pointer-events-none" />
                      )}

                      <div
                        className={`relative z-10 flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-[12px] md:rounded-xl flex items-center justify-center ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        <StatusIcon
                          size={15}
                          className={`md:hidden ${isDone ? "fill-current" : ""}`}
                        />
                        <StatusIcon
                          size={17}
                          className={`hidden md:block ${isDone ? "fill-current" : ""}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5 md:mb-1">
                          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-wrap">
                            <h4
                              className={`text-[13.5px] md:text-[15px] font-bold truncate leading-tight ${
                                isDone
                                  ? "text-gray-400 line-through"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.priority && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-[8px] md:rounded-lg text-[9.5px] md:text-[10px] font-black uppercase tracking-wider border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                              >
                                <span
                                  className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${pStyle.dot}`}
                                />
                                <span className="hidden md:inline">
                                  {task.priority}
                                </span>
                                <span className="md:hidden">
                                  {task.priority.charAt(0)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p
                            className={`text-[11.5px] line-clamp-1 mb-1.5 md:mb-2 leading-snug ${
                              isDone
                                ? "text-gray-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 md:gap-3 text-[11px] md:text-xs flex-wrap">
                          {task.startTime && (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold">
                              <Clock
                                size={11}
                                className="text-violet-500 md:hidden"
                              />
                              <Clock
                                size={12}
                                className="text-violet-500 hidden md:inline"
                              />
                              {task.startTime}
                              {task.endTime && ` – ${task.endTime}`}
                            </span>
                          )}
                          {task.category && (
                            <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-[8px] md:rounded-lg text-gray-600 dark:text-gray-400 font-semibold">
                              <FolderKanban size={10} className="md:hidden" />
                              <FolderKanban
                                size={11}
                                className="hidden md:inline"
                              />
                              <span className="max-w-[80px] truncate">
                                {task.category}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* ============= WEEKLY CHART ============= */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/25 md:shadow-lg">
                  <BarChart3 size={17} className="text-white md:hidden" />
                  <BarChart3 size={19} className="text-white hidden md:block" />
                </div>
                <div>
                  <h2 className="text-[15px] md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                    Weekly Progress
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    Last 7 days completion
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-3 items-end h-32 md:h-40">
              {distribution.map((d, i) => {
                const isToday = i === distribution.length - 1;
                const barHeight = Math.max(d.pct, 6);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 md:gap-2 group"
                  >
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-[10px] md:rounded-xl transition-all duration-500 ease-out relative ${
                          isToday
                            ? "bg-gradient-to-t from-violet-600 via-purple-500 to-indigo-400 shadow-md shadow-violet-500/30 md:shadow-lg"
                            : "bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 group-hover:from-violet-500 group-hover:to-indigo-400"
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] md:text-[11px] font-black leading-none ${
                        isToday
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======= RIGHT STACK ======= */}
        <div className="space-y-4 md:space-y-6">
          {/* ============= QUICK ACTIONS (app-style tiles) ============= */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-4 md:p-6">
            <div className="flex items-center gap-3 mb-3.5 md:mb-5">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25 md:shadow-lg">
                <Zap size={17} className="text-white md:hidden" />
                <Zap size={19} className="text-white hidden md:block" />
              </div>
              <div>
                <h2 className="text-[15px] md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                  Quick Actions
                </h2>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight hidden md:block">
                  Shortcuts to work faster
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3">
              <QuickAction
                href="/dashboard/tasks/new"
                label="New Task"
                icon={Plus}
                gradient="from-violet-500 to-indigo-600"
              />
              <QuickAction
                href="/dashboard/projects"
                label="Projects"
                icon={FolderKanban}
                gradient="from-blue-500 to-cyan-500"
              />
              <QuickAction
                href="/dashboard/tasks"
                label="AI Prioritize"
                icon={Sparkles}
                gradient="from-fuchsia-500 to-purple-600"
              />
              <QuickAction
                href="/dashboard/tasks"
                label="Schedule"
                icon={Clock}
                gradient="from-emerald-500 to-teal-500"
              />
              <QuickAction
                href="/dashboard/teams"
                label="My Team"
                icon={Users}
                gradient="from-rose-500 to-pink-600"
              />
              <QuickAction
                href="/dashboard/invite"
                label="Invite"
                icon={Send}
                gradient="from-amber-500 to-yellow-500"
              />
            </div>
          </div>

          {/* ============= UPCOMING TASKS ============= */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 md:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 md:shadow-lg">
                  <Calendar size={17} className="text-white md:hidden" />
                  <Calendar size={19} className="text-white hidden md:block" />
                </div>
                <div>
                  <h2 className="text-[15px] md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                    Upcoming
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {upcomingTasks.length} on your list
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-[11px] md:text-xs font-black text-violet-600 dark:text-violet-400 flex items-center gap-0.5 hover:gap-1 transition-all"
              >
                All <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-[340px] md:max-h-[380px] overflow-y-auto">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 md:p-8 text-center">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/25 flex items-center justify-center mx-auto mb-3">
                    <Trophy size={22} className="text-emerald-500 md:hidden" />
                    <Trophy
                      size={26}
                      className="text-emerald-500 hidden md:block"
                    />
                  </div>
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-[13.5px] md:text-sm mb-1">
                    All caught up! 🎉
                  </p>
                  <p className="text-[11.5px] md:text-xs text-gray-500 dark:text-gray-400">
                    Nothing coming up.
                  </p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const dateDiff = dayjs(task.date).diff(dayjs(), "day");
                  let dueLabel = dayjs(task.date).format("MMM D");
                  let dueClass = "text-gray-500 dark:text-gray-400";
                  let duePill =
                    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
                  if (dateDiff === 1) {
                    dueLabel = "Tomorrow";
                    dueClass = "text-orange-600 dark:text-orange-400";
                    duePill =
                      "bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50";
                  } else if (dateDiff === 0) {
                    dueLabel = "Today";
                    dueClass = "text-violet-600 dark:text-violet-400";
                    duePill =
                      "bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/50";
                  } else if (dateDiff <= 3) {
                    dueClass = "text-blue-600 dark:text-blue-400";
                  }

                  const pStyle = PRIORITY_STYLES[task.priority || "low"];

                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/edit/${task.id}`}
                      className="flex items-center gap-3 px-4 py-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group active:bg-gray-50 dark:active:bg-gray-800/40"
                    >
                      <div
                        className={`w-1 md:w-1.5 h-10 md:h-12 rounded-full ${pStyle.dot} flex-shrink-0`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] md:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[8px] md:rounded-lg text-[10px] md:text-[11px] font-bold border ${duePill}`}
                          >
                            <Calendar size={9.5} className="md:hidden" />
                            <Calendar size={10} className="hidden md:inline" />
                            {dueLabel}
                          </span>
                          {task.startTime && (
                            <span className="text-[10.5px] md:text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                              · {task.startTime}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-700 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* ============= RECENT PROJECTS ============= */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 md:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] md:rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-md shadow-fuchsia-500/25 md:shadow-lg">
                  <FolderKanban size={17} className="text-white md:hidden" />
                  <FolderKanban
                    size={19}
                    className="text-white hidden md:block"
                  />
                </div>
                <div>
                  <h2 className="text-[15px] md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                    Projects
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    {recentProjects.length} active
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {recentProjects.length === 0 ? (
                <div className="p-4 md:p-6">
                  <Link
                    href="/dashboard/projects"
                    className="flex items-center justify-center gap-2 w-full p-3.5 md:p-4 rounded-2xl md:rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors text-[12.5px] md:text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 active:scale-[0.99]"
                  >
                    <Plus size={16} />
                    Create first project
                  </Link>
                </div>
              ) : (
                recentProjects.map((project, i) => {
                  const color =
                    project.color || PROJECT_COLORS[i % PROJECT_COLORS.length];
                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects`}
                      className="flex items-center gap-3 px-4 py-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group active:bg-gray-50 dark:active:bg-gray-800/40"
                    >
                      <div
                        className={`w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md flex-shrink-0`}
                      >
                        <FolderKanban
                          size={16}
                          className="text-white md:hidden"
                        />
                        <FolderKanban
                          size={18}
                          className="text-white hidden md:block"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] md:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-[8px] text-[9.5px] md:text-[10px] font-black uppercase tracking-wide border ${
                              project.status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                                : project.status === "completed"
                                  ? "bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-700 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========== Sub-Components =========== */

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  lightBg,
  sub,
  progress,
  warning,
}: {
  label: string;
  value: number | string;
  icon: any;
  gradient: string;
  lightBg: string;
  sub?: string;
  progress?: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`group relative bg-white dark:bg-gray-900 rounded-[20px] md:rounded-2xl p-3 md:p-5 border shadow-sm hover:shadow-md transition-all border-gray-100 dark:border-gray-800 active:scale-[0.99] md:hover:-translate-y-1 ${
        warning ? "ring-2 ring-red-500/20 dark:ring-red-500/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div
          className={`w-8 h-8 md:w-11 md:h-11 rounded-[12px] md:rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md md:shadow-lg md:group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={15} className="text-white md:hidden" />
          <Icon size={19} className="text-white hidden md:block" />
        </div>
        {warning && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <div className="text-[20px] md:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-0.5 md:mb-1 leading-none">
        {value}
      </div>
      <div className="text-[10.5px] md:text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 md:mb-2 leading-none">
        {label}
      </div>
      {progress !== undefined && (
        <div className="w-full h-1 md:h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1 md:mb-0">
          <div
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sub && (
        <div
          className={`text-[10px] md:text-[11px] font-bold mt-1 md:mt-2 leading-none ${
            warning ? "text-red-500" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  gradient,
}: {
  href: string;
  label: string;
  icon: any;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center gap-1.5 md:gap-2.5 p-2.5 md:p-4 rounded-[16px] md:rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-transparent transition-all active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-lg overflow-hidden"
    >
      <div
        className={`w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm md:shadow-md md:group-hover:scale-110 md:group-hover:shadow-lg transition-all duration-300`}
      >
        <Icon size={16} className="text-white md:hidden" />
        <Icon size={19} className="text-white hidden md:block" />
      </div>
      <span className="text-[10.5px] md:text-xs font-bold text-gray-700 dark:text-gray-300 md:group-hover:text-gray-900 md:group-hover:dark:text-white text-center leading-tight tracking-tight">
        {label}
      </span>
      <div
        className={`absolute inset-0 rounded-[16px] md:rounded-2xl bg-gradient-to-br ${gradient} opacity-0 md:group-hover:opacity-[0.03] transition-opacity`}
      />
    </Link>
  );
}
