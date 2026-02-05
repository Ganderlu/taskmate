"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseClient";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { CheckCircle2, Clock, RotateCcw, Ban, Archive, CalendarDays, Loader2 } from "lucide-react";

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

  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!auth.currentUser) return;
      
      try {
        const tasksRef = collection(db, "tasks");
        const oneWeekAgo = Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        const userId = auth.currentUser.uid;

        const queries = {
          completed: query(tasksRef, where("userId", "==", userId), where("status", "==", "completed"), where("deleted", "==", false)),
          pending: query(tasksRef, where("userId", "==", userId), where("status", "==", "pending"), where("deleted", "==", false)),
          ongoing: query(tasksRef, where("userId", "==", userId), where("status", "==", "ongoing"), where("deleted", "==", false)),
          cancelled: query(tasksRef, where("userId", "==", userId), where("status", "==", "cancelled"), where("deleted", "==", false)),
          deleted: query(tasksRef, where("userId", "==", userId), where("deleted", "==", true)),
          pastWeek: query(tasksRef, where("userId", "==", userId), where("createdAt", ">=", oneWeekAgo), where("deleted", "==", false)),
        };

        // Note: In a real app with many tasks, you might want to use aggregation queries or counters.
        // For now, fetching docs client-side is okay for small datasets.
        const results = await Promise.all(
          Object.entries(queries).map(async ([key, q]) => {
            const snap = await getDocs(q);
            return [key, snap.size];
          })
        );

        setCounts(Object.fromEntries(results) as typeof counts);
      } catch (error) {
        console.error("Error fetching project stats:", error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state to ensure we have a user
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchTaskStats();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const projects = [
    {
      title: "Completed",
      tasks: counts.completed,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      desc: "Tasks finished successfully"
    },
    {
      title: "Pending",
      tasks: counts.pending,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
      desc: "Tasks waiting to be started"
    },
    {
      title: "Ongoing",
      tasks: counts.ongoing,
      icon: RotateCcw,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
      desc: "Tasks currently in progress"
    },
    {
      title: "Past Week",
      tasks: counts.pastWeek,
      icon: CalendarDays,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      desc: "Activity in the last 7 days"
    },
    {
      title: "Cancelled",
      tasks: counts.cancelled,
      icon: Ban,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30",
      desc: "Tasks that were stopped"
    },
    {
      title: "Deleted",
      tasks: counts.deleted,
      icon: Archive,
      color: "text-gray-600",
      bg: "bg-gray-100 dark:bg-gray-800",
      desc: "Tasks moved to trash"
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Projects Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Track your progress across different statuses and timelines.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <div
            key={index}
            className="group p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${project.bg} transition-colors group-hover:scale-105 duration-300`}>
                <project.icon className={`w-6 h-6 ${project.color}`} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.tasks}
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {project.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
