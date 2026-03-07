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
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface ProjectStats {
  name: string;
  total: number;
  completed: number;
  progress: number;
  status: "active" | "completed" | "archived";
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
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

          let status: "active" | "completed" | "archived" = "active";
          if (total > 0 && total === completed) status = "completed";
          if (total === 0) status = "archived";

          return {
            name: cat,
            total,
            completed,
            progress,
            status,
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

  const filteredProjects = projectStats.filter((project) => {
    if (filter === "all") return true;
    if (filter === "active") return project.status === "active";
    if (filter === "completed") return project.status === "completed";
    return true;
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage your projects and track progress across all categories.
          </p>
        </div>

        <Link
          href="/dashboard/tasks/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={20} />
          <span>New Project</span>
        </Link>
      </div>

      {/* My Projects Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-purple-600" />
            My Projects
          </h2>

          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  filter === f
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No projects found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filter === "all"
                ? "Start by creating tasks in new categories."
                : `No ${filter} projects found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => {
              const Icon = getProjectIcon(project.name);
              return (
                <div
                  key={index}
                  className="group relative p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-300"
                >
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-gray-400 hover:text-purple-600 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                      {project.total} Tasks
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                      {project.completed} Completed
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {project.progress}%
                      </span>
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          project.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : project.status === "active"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {project.status.charAt(0).toUpperCase() +
                          project.status.slice(1)}
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          project.progress === 100
                            ? "bg-green-500"
                            : "bg-gradient-to-r from-purple-500 to-blue-500"
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Link
                      href="/dashboard/tasks"
                      className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1"
                    >
                      View Tasks <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
