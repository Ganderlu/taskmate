"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  Trash2,
  Check,
  X,
  Users,
  AlertCircle,
  Calendar,
  Shield,
  Sparkles,
  FolderKanban,
  Settings as SettingsIcon,
  Filter,
  CheckCheck,
  Archive,
  Mail,
} from "lucide-react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  addDoc,
  increment,
  getDocs,
} from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

type FilterKey = "all" | "unread" | "invites" | "tasks" | "system";

interface Notification {
  id: string;
  type: "invite" | "task_assigned" | "task_completed" | "mention" | "system";
  title: string;
  message: string;
  createdAt: Timestamp | Date;
  read: boolean;
  data?: any;
}

function safeMillis(ts: Timestamp | Date | undefined): number {
  if (!ts) return Date.now();
  if (ts instanceof Date) return ts.getTime();
  if ((ts as any).toMillis) return (ts as any).toMillis();
  if ((ts as any).seconds) return (ts as any).seconds * 1000;
  return Date.now();
}

function systemNotifs(userId: string): Notification[] {
  const now = new Date();
  return [
    {
      id: `sys-welcome-${userId}`,
      type: "system",
      title: "Welcome to TaskMate AI ✨",
      message:
        "Your workspace is ready. Create tasks, assign categories, and invite teammates to get started.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      read: false,
    },
    {
      id: `sys-sec-${userId}`,
      type: "system",
      title: "Security & Backup Active",
      message:
        "Your tasks are being auto-saved to Firestore in real-time. Encrypted connections are enabled.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      read: true,
    },
    {
      id: `sys-productivity-${userId}`,
      type: "task_completed",
      title: "Productivity Tip for Today",
      message:
        "Try using the High Priority flag on tasks with tight deadlines — they bubble to the top of your list.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
      read: false,
    },
  ];
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const invitesQuery = query(
        collection(db, "team_members"),
        where("email", "==", user.email),
        orderBy("createdAt", "desc"),
      );

      const unsubInvites = onSnapshot(invitesQuery, async (snapshot) => {
        const inviteNotifications: Notification[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let teamName = "Unknown Team";

          if (data.teamId) {
            try {
              const teamDoc = await getDoc(doc(db, "teams", data.teamId));
              if (teamDoc.exists()) teamName = teamDoc.data().name;
            } catch (e) {
              console.error(e);
            }
          }

          // Treat active/accepted invites as read, pending as unread
          const isPending = data.status === "pending";
          inviteNotifications.push({
            id: docSnap.id,
            type: "invite",
            title: isPending ? "Team Invitation" : "You joined a team",
            message: isPending
              ? `You have been invited to join "${teamName}" as ${data.role}.`
              : `You've been added to "${teamName}" as ${data.role}.`,
            createdAt: data.createdAt || Timestamp.now(),
            read: !isPending,
            data: {
              teamId: data.teamId,
              inviteId: docSnap.id,
              status: data.status,
            },
          });
        }

        // Fetch tasks to generate task-related system notifications
        const taskNotifs: Notification[] = [];
        try {
          const tasksQ = query(
            collection(db, "tasks"),
            where("userId", "==", user.uid),
            where("deleted", "==", false),
          );
          const tasksSnap = await getDocs(tasksQ);
          const today = new Date();
          tasksSnap.docs.forEach((d) => {
            const t = d.data();
            // Due today
            if (t.dueDate && t.status !== "completed") {
              const due = new Date(t.dueDate);
              const sameDay =
                due.getFullYear() === today.getFullYear() &&
                due.getMonth() === today.getMonth() &&
                due.getDate() === today.getDate();
              if (sameDay && t.priority === "High") {
                taskNotifs.push({
                  id: `due-today-${d.id}`,
                  type: "task_assigned",
                  title: "High-priority task due today",
                  message: `"${t.title || "Untitled"}" — ${format(
                    due,
                    "h:mm a",
                  )} deadline`,
                  createdAt: new Date(
                    today.getTime() - 1000 * 60 * 60 * 2,
                  ),
                  read: false,
                  data: { taskId: d.id, dueDate: t.dueDate },
                });
              }
            }
            // Recently completed
            if (
              t.status === "completed" &&
              t.updatedAt &&
              typeof t.updatedAt === "string"
            ) {
              const updated = new Date(t.updatedAt);
              if (today.getTime() - updated.getTime() < 1000 * 60 * 60 * 24) {
                taskNotifs.push({
                  id: `completed-${d.id}`,
                  type: "task_completed",
                  title: "Nice! Task completed",
                  message: `"${t.title || "Untitled"}" was marked complete`,
                  createdAt: updated,
                  read: false,
                });
              }
            }
          });
        } catch (e) {
          /* silent */
        }

        const base = systemNotifs(user.uid);

        setNotifications(
          [...inviteNotifications, ...taskNotifs, ...base].sort(
            (a, b) => safeMillis(b.createdAt) - safeMillis(a.createdAt),
          ),
        );
        setLoading(false);
      });

      return () => unsubInvites();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    if (!confirm("Clear all notifications?")) return;
    setNotifications([]);
  };

  const handleClearRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const handleAcceptInvite = async (notification: Notification) => {
    try {
      if (!auth.currentUser) {
        alert("You must be logged in to accept invites.");
        return;
      }
      if (!notification.data?.inviteId) {
        alert("Invalid invitation data.");
        return;
      }
      const inviteRef = doc(db, "team_members", notification.data.inviteId);
      await updateDoc(inviteRef, {
        status: "active",
        userId: auth.currentUser.uid,
        joinedAt: new Date().toISOString(),
      });
      if (notification.data.teamId) {
        const teamRef = doc(db, "teams", notification.data.teamId);
        await updateDoc(teamRef, { memberCount: increment(1) });
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? {
                ...n,
                read: true,
                title: "Invitation accepted 🎉",
                message: n.message.replace("invited to join", "joined"),
              }
            : n,
        ),
      );
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      alert("Failed to accept invite: " + (error.message || "Unknown error"));
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    try {
      if (!notification.data?.inviteId) return;
      await deleteDoc(doc(db, "team_members", notification.data.inviteId));
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notification.id),
      );
    } catch (error) {
      console.error("Error declining invite:", error);
      alert("Failed to decline invite");
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "all") return true;
      if (filter === "unread") return !n.read;
      if (filter === "invites") return n.type === "invite";
      if (filter === "tasks")
        return n.type === "task_assigned" || n.type === "task_completed";
      if (filter === "system") return n.type === "system" || n.type === "mention";
      return true;
    });
  }, [notifications, filter]);

  const tabs: { key: FilterKey; label: string; icon: any; count?: number }[] = [
    { key: "all", label: "All", icon: Bell },
    { key: "unread", label: "Unread", icon: AlertCircle, count: unreadCount },
    { key: "invites", label: "Invites", icon: Mail },
    { key: "tasks", label: "Tasks", icon: CheckCircle2 },
    { key: "system", label: "System", icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-violet-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
              Alerts & Activity
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Stay updated with team invites, task reminders, and account activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCheck size={15} />
            <span className="hidden sm:inline">Mark all as read</span>
            <span className="sm:hidden">All read</span>
          </button>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
              <button
                onClick={handleClearRead}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Archive size={12} />
                Clear read
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 size={12} />
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total"
          value={notifications.length}
          icon={Bell}
          gradient="from-violet-500 to-indigo-500"
          bg="bg-violet-50 dark:bg-violet-900/25"
        />
        <StatCard
          label="Unread"
          value={unreadCount}
          icon={AlertCircle}
          gradient="from-rose-500 to-pink-500"
          bg="bg-rose-50 dark:bg-rose-900/25"
          pulse={unreadCount > 0}
        />
        <StatCard
          label="Invites"
          value={notifications.filter((n) => n.type === "invite").length}
          icon={Mail}
          gradient="from-sky-500 to-blue-500"
          bg="bg-sky-50 dark:bg-sky-900/25"
        />
        <StatCard
          label="Tasks"
          value={
            notifications.filter(
              (n) =>
                n.type === "task_assigned" || n.type === "task_completed",
            ).length
          }
          icon={CheckCircle2}
          gradient="from-emerald-500 to-teal-500"
          bg="bg-emerald-50 dark:bg-emerald-900/25"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/60 rounded-2xl overflow-x-auto snap-x scroll-smooth">
        {tabs.map((t) => {
          const isActive = filter === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`snap-center shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? "bg-white dark:bg-gray-900 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[9px] font-extrabold rounded-full ${
                    isActive
                      ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200"
                  }`}
                >
                  {t.count > 9 ? "9+" : t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Loading your notifications…
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = iconFor(notification.type);
            const color = colorFor(notification.type);
            return (
              <div
                key={notification.id}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 active:scale-[0.995] ${
                  notification.read
                    ? "bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800 opacity-80"
                    : "bg-white dark:bg-gray-900 border-violet-100 dark:border-violet-900/50 shadow-sm shadow-violet-500/5 ring-1 ring-violet-500/[0.04]"
                }`}
              >
                {!notification.read && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" />
                )}

                <div className="flex gap-3 sm:gap-4">
                  <div
                    className={`relative p-2.5 sm:p-3 rounded-xl h-fit shrink-0 ${color.container}`}
                  >
                    <Icon
                      size={20}
                      className={`sm:w-[22px] sm:h-[22px] ${color.icon}`}
                    />
                    {!notification.read && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
                      <h3 className="text-sm sm:text-[15px] font-extrabold text-gray-900 dark:text-white leading-snug">
                        {notification.title}
                      </h3>
                      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap sm:ml-2 shrink-0">
                        {formatDistanceToNow(
                          new Date(safeMillis(notification.createdAt)),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {notification.type === "invite" &&
                        notification.data?.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleAcceptInvite(notification)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-green-500/20 transition-all active:scale-95"
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(notification)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 text-xs font-bold rounded-xl transition-all active:scale-95"
                            >
                              <X size={13} /> Decline
                            </button>
                          </>
                        )}

                      {notification.type === "task_assigned" && (
                        <Link
                          href="/dashboard/tasks"
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all active:scale-95"
                        >
                          <Calendar size={13} /> View task
                        </Link>
                      )}

                      {notification.type === "task_completed" && (
                        <span className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl">
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      )}

                      {notification.type === "system" && (
                        <Link
                          href={
                            notification.title.toLowerCase().includes("security")
                              ? "/dashboard/privacy"
                              : "/dashboard"
                          }
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                          <SettingsIcon size={13} /> Learn more
                        </Link>
                      )}

                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                        >
                          <Check size={12} /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ========== Helpers & Subcomponents ========== */

function iconFor(type: string) {
  switch (type) {
    case "invite":
      return Users;
    case "task_assigned":
      return Calendar;
    case "task_completed":
      return CheckCircle2;
    case "mention":
      return MessageSquare;
    default:
      return Sparkles;
  }
}

function colorFor(type: string): {
  container: string;
  icon: string;
  dot: string;
} {
  switch (type) {
    case "invite":
      return {
        container: "bg-violet-50 dark:bg-violet-900/30",
        icon: "text-violet-600 dark:text-violet-400",
        dot: "bg-violet-500",
      };
    case "task_assigned":
      return {
        container: "bg-sky-50 dark:bg-sky-900/30",
        icon: "text-sky-600 dark:text-sky-400",
        dot: "bg-sky-500",
      };
    case "task_completed":
      return {
        container: "bg-emerald-50 dark:bg-emerald-900/30",
        icon: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "mention":
      return {
        container: "bg-amber-50 dark:bg-amber-900/30",
        icon: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
      };
    default:
      return {
        container: "bg-slate-50 dark:bg-slate-800",
        icon: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-500",
      };
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  bg,
  pulse,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
  bg: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`relative p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-none">
            {value}
          </p>
        </div>
        <div
          className={`p-2 rounded-xl ${bg} group-hover:scale-110 transition-transform ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          <Icon
            size={18}
            className={`bg-clip-text bg-gradient-to-br ${gradient} text-transparent`}
            style={{
              background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
            }}
          />
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
      />
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const map: Record<FilterKey, { title: string; desc: string }> = {
    all: {
      title: "You're all caught up 🎉",
      desc: "No notifications right now. We'll alert you here when something needs attention.",
    },
    unread: {
      title: "Inbox zero ✨",
      desc: "Everything's been read. You're on top of it!",
    },
    invites: {
      title: "No pending invites",
      desc: "Ask team owners to send invites via the Invite a Friend page.",
    },
    tasks: {
      title: "No task updates",
      desc: "Create tasks with due dates to see reminders pop up here.",
    },
    system: {
      title: "No system messages",
      desc: "Account updates, tips, and security notices will appear here.",
    },
  };
  const info = map[filter];
  return (
    <div className="relative p-8 sm:p-14 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/60 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 overflow-hidden text-center">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-violet-100/50 dark:bg-violet-900/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-sky-100/50 dark:bg-sky-900/10 blur-3xl" />
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
          <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white mb-2">
          {info.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
          {info.desc}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard/tasks/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all active:scale-95"
          >
            <Calendar size={14} /> Create a task
          </Link>
          <Link
            href="/dashboard/invite"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-800 transition-all active:scale-95"
          >
            <Users size={14} /> Invite teammates
          </Link>
        </div>
      </div>
    </div>
  );
}
