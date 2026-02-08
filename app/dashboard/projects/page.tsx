"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Ban,
  Archive,
  CalendarDays,
  Loader2,
  Briefcase,
  GraduationCap,
  User,
  Building2,
  Users,
  Folder,
} from "lucide-react";

interface ProjectStats {
  name: string;
  total: number;
  completed: number;
  progress: number;
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    completed: 0,
    pending: 0,
    ongoing: 0,
    cancelled: 0,
    deleted: 0,
    pastWeek: 0,
  });
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        const tasksRef = collection(db, "tasks");

        // 1. Fetch Task Status Counts (Existing logic)
        const oneWeekAgo = Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        );

        const queries = {
          completed: query(
            tasksRef,
            where("userId", "==", userId),
            where("status", "==", "completed"),
            where("deleted", "==", false),
          ),
          pending: query(
            tasksRef,
            where("userId", "==", userId),
            where("status", "==", "pending"),
            where("deleted", "==", false),
          ),
          ongoing: query(
            tasksRef,
            where("userId", "==", userId),
            where("status", "==", "ongoing"),
            where("deleted", "==", false),
          ),
          cancelled: query(
            tasksRef,
            where("userId", "==", userId),
            where("status", "==", "cancelled"),
            where("deleted", "==", false),
          ),
          deleted: query(
            tasksRef,
            where("userId", "==", userId),
            where("deleted", "==", true),
          ),
          pastWeek: query(
            tasksRef,
            where("userId", "==", userId),
            where("createdAt", ">=", oneWeekAgo),
            where("deleted", "==", false),
          ),
        };

        const results = await Promise.all(
          Object.entries(queries).map(async ([key, q]) => {
            const snap = await getDocs(q);
            return [key, snap.size];
          }),
        );

        setCounts(Object.fromEntries(results) as typeof counts);

        // 2. Fetch Projects (Categories) Data
        // Fetch custom categories
        const categoriesQuery = query(
          collection(db, "categories"),
          where("userId", "==", userId),
        );
        const categoriesSnap = await getDocs(categoriesQuery);
        const customCategories = categoriesSnap.docs.map(
          (doc) => doc.data().name,
        );

        // Default categories (matching TasksPage)
        const defaultCategories = [
          "School",
          "Work",
          "Personal",
          "Business",
          "Teams",
          "Freelancer",
        ];
        const allCategories = Array.from(
          new Set([...defaultCategories, ...customCategories]),
        );

        // Fetch all active tasks to calculate per-project stats
        // We fetch all tasks once instead of N queries
        const allTasksQuery = query(
          tasksRef,
          where("userId", "==", userId),
          where("deleted", "==", false),
        );
        const allTasksSnap = await getDocs(allTasksQuery);
        const allTasks = allTasksSnap.docs.map((doc) => doc.data());

        // Calculate stats per category
        const stats: ProjectStats[] = allCategories.map((cat) => {
          const catTasks = allTasks.filter(
            (task) => (task.category || "Work") === cat,
          );
          const total = catTasks.length;
          const completed = catTasks.filter(
            (task) => task.status === "completed",
          ).length;
          const progress =
            total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            name: cat,
            total,
            completed,
            progress,
          };
        });

        // Sort by total tasks (descending)
        stats.sort((a, b) => b.total - a.total);

        setProjectStats(stats);
      } catch (error) {
        console.error("Error fetching project stats:", error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state to ensure we have a user
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getProjectIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "school":
        return GraduationCap;
      case "work":
        return Briefcase;
      case "personal":
        return User;
      case "business":
        return Building2;
      case "teams":
        return Users;
      default:
        return Folder;
    }
  };

  const statusCards = [
    {
      title: "Completed",
      tasks: counts.completed,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      desc: "Tasks finished successfully",
    },
    {
      title: "Pending",
      tasks: counts.pending,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
      desc: "Tasks waiting to be started",
    },
    {
      title: "Ongoing",
      tasks: counts.ongoing,
      icon: RotateCcw,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
      desc: "Tasks currently in progress",
    },
    {
      title: "Cancelled",
      tasks: counts.cancelled,
      icon: Ban,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30",
      desc: "Tasks that were stopped",
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
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Projects Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Manage your projects and track progress across all categories.
        </p>
      </div>

      {/* My Projects Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Folder className="w-5 h-5 text-purple-600" />
          My Projects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectStats.map((project, index) => {
            const Icon = getProjectIcon(project.name);
            return (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                      {project.total}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Total Tasks
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {project.name}
                  </h3>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 pt-1">
                      {project.completed} completed / {project.total} total
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status Overview Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Status Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusCards.map((card, index) => (
            <div
              key={index}
              className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.tasks}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
