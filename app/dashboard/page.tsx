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
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-2xl shadow-purple-500/20">
        {/* Decorative */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-10 right-32 w-20 h-20 bg-white/5 rounded-full border border-white/10" />
        <div className="absolute bottom-10 right-16 w-12 h-12 bg-white/5 rounded-full border border-white/10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 md:gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 shadow-inner">
              <span className="drop-shadow-lg">{greetingInfo.emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-2">
                <CalendarDays size={14} />
                {dayjs().format("dddd, MMMM D, YYYY")}
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                {greetingInfo.greeting},{" "}
                <span className="drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                  {userName}
                </span>
              </h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl leading-relaxed">
                {greetingInfo.message}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-stretch md:items-end">
            <div className="grid grid-cols-2 md:flex md:flex-row gap-3">
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

            {/* Productivity Score */}
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          gradient="from-purple-500 to-indigo-500"
          lightBg="bg-purple-50 dark:bg-purple-900/20"
          sub={`${stats.todayProgress}% done today`}
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
          gradient="from-blue-500 to-indigo-500"
          lightBg="bg-indigo-50 dark:bg-indigo-900/20"
          sub="Active tasks"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          lightBg="bg-amber-50 dark:bg-amber-900/20"
          sub="Waiting to start"
        />
        <StatCard
          label="High Priority"
          value={stats.highPriority}
          icon={Flag}
          gradient="from-red-500 to-rose-500"
          lightBg="bg-red-50 dark:bg-red-900/20"
          sub="Requires attention"
          warning={stats.highPriority > 0}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TODAY'S SCHEDULE */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks Timeline */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Clock3 size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Today's Schedule
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {todayTasks.length > 0
                      ? `${stats.todayCompleted} of ${todayTasks.length} done · ${dayjs().format("MMM D")}`
                      : `No tasks scheduled for today`}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-semibold text-sm transition-colors"
              >
                <Plus size={15} />
                Add
              </Link>
            </div>

            <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto">
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                    <Calendar
                      size={36}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                    Your day is wide open
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
                    Plan your day by adding a new task. Start small and build
                    momentum.
                  </p>
                  <Link
                    href="/dashboard/tasks/new"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all text-sm"
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
                    <div
                      key={task.id}
                      className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                        isDone
                          ? "bg-gray-50/40 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 opacity-75"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-black/20"
                      }`}
                    >
                      {/* Timeline indicator */}
                      <div
                        className="absolute left-[18px] top-[52px] -bottom-3 w-px bg-gray-100 dark:bg-gray-800"
                        style={{
                          display:
                            idx === todayTasks.length - 1 ? "none" : "block",
                        }}
                      />

                      <div
                        className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        <StatusIcon
                          size={17}
                          className={isDone ? "fill-current" : ""}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <h4
                              className={`text-[15px] font-bold truncate ${
                                isDone
                                  ? "text-gray-400 line-through"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {task.title}
                            </h4>
                            {/* Priority chip */}
                            {task.priority && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`}
                                />
                                {task.priority}
                              </span>
                            )}
                          </div>

                          <Link
                            href="/dashboard/tasks"
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </div>

                        {task.description && (
                          <p
                            className={`text-xs line-clamp-1 mb-2 ${
                              isDone
                                ? "text-gray-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs">
                          {task.startTime && (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 font-medium">
                              <Clock size={12} className="text-purple-500" />
                              {task.startTime}
                              {task.endTime && ` - ${task.endTime}`}
                            </span>
                          )}
                          {task.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 font-medium">
                              <FolderKanban size={11} />
                              {task.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Weekly Productivity Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                  <BarChart3 size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Weekly Productivity
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Completion rate over the last 7 days
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
                  Completion %
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end h-40">
              {distribution.map((d, i) => {
                const isToday = i === distribution.length - 1;
                const maxHeight = 100;
                const barHeight = Math.max(d.pct, 5);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ease-out relative ${
                          isToday
                            ? "bg-gradient-to-t from-purple-600 to-indigo-400 shadow-lg shadow-purple-500/30"
                            : "bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 group-hover:from-purple-500 group-hover:to-indigo-400"
                        }`}
                        style={{ height: `${(barHeight / maxHeight) * 100}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          <div className="bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            {d.completed}/{d.total} completed
                          </div>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        isToday
                          ? "text-purple-600 dark:text-purple-400"
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

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Zap size={19} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Quick Actions
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Work faster with shortcuts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                href="/dashboard/tasks/new"
                label="New Task"
                icon={Plus}
                gradient="from-purple-500 to-indigo-500"
              />
              <QuickAction
                href="/dashboard/projects"
                label="New Project"
                icon={FolderKanban}
                gradient="from-blue-500 to-cyan-500"
              />
              <QuickAction
                href="/dashboard/tasks"
                label="Prioritize AI"
                icon={Sparkles}
                gradient="from-violet-500 to-fuchsia-500"
              />
              <QuickAction
                href="/dashboard/tasks"
                label="Smart Schedule"
                icon={Clock}
                gradient="from-green-500 to-emerald-500"
              />
              <QuickAction
                href="/dashboard/teams"
                label="Invite Team"
                icon={Users}
                gradient="from-pink-500 to-rose-500"
              />
              <QuickAction
                href="/dashboard/invite"
                label="Share Link"
                icon={Send}
                gradient="from-amber-500 to-yellow-500"
              />
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Calendar size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Upcoming
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Next tasks on your list
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 hover:gap-1 transition-all"
              >
                View all <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-[380px] overflow-y-auto">
              {upcomingTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <Trophy
                      size={26}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
                    All caught up!
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No upcoming tasks. Enjoy your free time.
                  </p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const dateDiff = dayjs(task.date).diff(dayjs(), "day");
                  let dueLabel = dayjs(task.date).format("MMM D");
                  let dueClass = "text-gray-500 dark:text-gray-400";
                  if (dateDiff === 1) {
                    dueLabel = "Tomorrow";
                    dueClass = "text-orange-600 dark:text-orange-400";
                  } else if (dateDiff === 0) {
                    dueLabel = "Today";
                    dueClass = "text-purple-600 dark:text-purple-400";
                  } else if (dateDiff <= 3) {
                    dueClass = "text-blue-600 dark:text-blue-400";
                  }

                  const pStyle = PRIORITY_STYLES[task.priority || "low"];

                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/edit/${task.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <div
                        className={`w-1.5 h-12 rounded-full ${pStyle.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[11px] font-semibold ${dueClass}`}
                          >
                            <Calendar size={10} className="inline mr-1" />
                            {dueLabel}
                          </span>
                          {task.startTime && (
                            <span className="text-[11px] font-medium text-gray-400">
                              · {task.startTime}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <FolderKanban size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Recent Projects
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {recentProjects.length} active project
                    {recentProjects.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {recentProjects.length === 0 ? (
                <div className="p-6">
                  <Link
                    href="/dashboard/projects"
                    className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <Plus size={16} />
                    Create your first project
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
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}
                      >
                        <FolderKanban size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                              project.status === "active"
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50"
                                : project.status === "completed"
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all"
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
      className={`group relative bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 border shadow-sm hover:shadow-md transition-all border-gray-100 dark:border-gray-800 hover:-translate-y-1 ${
        warning ? "ring-2 ring-red-500/20 dark:ring-red-500/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={19} className="text-white" />
        </div>
        {warning && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
        {value}
      </div>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        {label}
      </div>
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sub && (
        <div
          className={`mt-2 text-[11px] font-bold ${
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
      className="group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-transparent transition-all hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity"
        style={{ backgroundImage: `linear-gradient(var(--tw-gradient-stops))` }}
      />
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}
      >
        <Icon size={19} className="text-white" />
      </div>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-center leading-tight">
        {label}
      </span>
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity`}
      />
    </Link>
  );
}
