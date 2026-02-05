"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export default function DashboardPage() {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (user.displayName) {
          setUserName(user.displayName);
        } else if (user.email) {
          setUserName(user.email.split("@")[0]);
        }

        await fetchDashboardData(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch stats
      const tasksRef = collection(db, "tasks");
      const today = dayjs().format("YYYY-MM-DD");

      // Get all active tasks for user to calculate stats
      // Note: For scalability, aggregation queries are better, but for this scale, client-side is fine
      const q = query(
        tasksRef,
        where("userId", "==", userId),
        where("deleted", "==", false),
      );
      const snapshot = await getDocs(q);

      let total = 0;
      let inProgress = 0;
      let completed = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === "completed") completed++;
        else if (data.status === "pending" || data.status === "ongoing")
          inProgress++;
      });

      setTaskStats({ total, inProgress, completed });

      // Fetch recent activity (e.g., last 3 tasks added or modified)
      // Since we don't have a separate activity log, we'll use recent tasks
      // Assuming 'createdAt' or just use tasks
      const recentQ = query(
        tasksRef,
        where("userId", "==", userId),
        where("deleted", "==", false),
        // orderBy("date", "desc"), // Requires index
        limit(5),
      );

      const recentSnapshot = await getDocs(recentQ);
      const recent = recentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecentActivity(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const stats = [
    {
      label: "Total Tasks",
      value: taskStats.total,
      icon: ListTodo,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Active / Pending",
      value: taskStats.inProgress,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Completed",
      value: taskStats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back!,{" "}
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {userName}
            </span>
            ! Here's your overview.
          </p>
        </div>
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={20} />
          <span>New Task</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity / Quick Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Tasks
            </h2>
            <Link
              href="/dashboard/tasks"
              className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((task, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={12} />
                      <span>{task.date}</span>
                      {task.status && (
                        <span
                          className={`px-1.5 py-0.5 rounded capitalize ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No recent activity.
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions or Promo */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Boost your productivity</h2>
            <p className="text-purple-100 mb-6 max-w-sm">
              Organize your tasks, collaborate with your team, and track your
              progress all in one place.
            </p>
            <Link
              href="/dashboard/tasks"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/30 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );
}
