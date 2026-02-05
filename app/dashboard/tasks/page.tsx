"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import dayjs from "dayjs";
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  Loader2,
} from "lucide-react";
import DateSelector from "../../dateSelector";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  date: string;
  userId: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  status: "pending" | "completed" | "ongoing" | "cancelled";
  priority?: "low" | "medium" | "high";
  deleted?: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );
  const [loading, setLoading] = useState(true);

  // Load tasks when date changes or user auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadTasksForDate(selectedDate);
      } else {
        setLoading(false);
        setTasks([]);
      }
    });
    return () => unsubscribe();
  }, [selectedDate]);

  const loadTasksForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "tasks"),
        where("userId", "==", auth.currentUser.uid),
        where("date", "==", dateStr),
        where("deleted", "==", false),
      );

      const snapshot = await getDocs(q);
      const list: Task[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Task,
      );

      // Sort locally by startTime if available, otherwise created time (not fetched here but could be added)
      list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      setTasks(list);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (err) {
      console.error("Error updating task status:", err);
      // Revert
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: currentStatus as any } : t,
        ),
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { deleted: true }); // Soft delete
    } catch (err) {
      console.error("Error deleting task:", err);
      loadTasksForDate(selectedDate); // Re-fetch to restore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your daily schedule
          </p>
        </div>
        <Link
          href="/dashboard/tasks/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={20} />
          <span>Add Task</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No tasks for this day
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Click "Add Task" to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 ${
                  task.status === "completed"
                    ? "border-gray-100 dark:border-gray-800 opacity-75"
                    : "border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-md"
                }`}
              >
                <button
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className={`flex-shrink-0 transition-colors ${
                    task.status === "completed"
                      ? "text-green-500"
                      : "text-gray-300 hover:text-purple-500"
                  }`}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 size={24} className="fill-current" />
                  ) : (
                    <Circle size={24} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-medium truncate transition-all ${
                      task.status === "completed"
                        ? "text-gray-400 line-through"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {task.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>
                          {task.startTime} - {task.endTime}
                        </span>
                      </div>
                    )}
                    {task.priority && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : task.priority === "medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/dashboard/edit-task/${task.id}`}>
                    <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
