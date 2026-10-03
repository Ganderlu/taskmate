"use client";

import { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
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
  Edit,
  Copy,
  Sparkles,
  Search,
  Filter,
  SortAsc,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Flag,
  X,
  Download,
  BarChart3,
  ListTodo,
  PlayCircle,
  PauseCircle,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import DateSelector from "../../dateSelector";
import Link from "next/link";
import VoiceCommand from "../../components/VoiceCommand";

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
  category?: string;
  reasoning?: string;
  createdAt?: string;
}

type StatusFilter = "all" | "pending" | "ongoing" | "completed" | "cancelled";
type SortOption = "priority" | "time" | "status" | "alphabetical" | "created";

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  Work: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  Personal: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  Study: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  Health: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  Finance: {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800",
    dot: "bg-cyan-500",
  },
  School: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    dot: "bg-indigo-500",
  },
  Business: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
  },
  Teams: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  Freelancer: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    dot: "bg-teal-500",
  },
  Default: {
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-500",
  },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Default;
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "high":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
        ring: "ring-red-500/30",
        dot: "bg-red-500",
        label: "High",
      };
    case "medium":
      return {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
        ring: "ring-amber-500/30",
        dot: "bg-amber-500",
        label: "Medium",
      };
    case "low":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        ring: "ring-blue-500/30",
        dot: "bg-blue-500",
        label: "Low",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-800",
        text: "text-gray-600 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-700",
        ring: "ring-gray-500/20",
        dot: "bg-gray-400",
        label: "None",
      };
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "completed":
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
        label: "Completed",
        icon: CheckCircle2,
      };
    case "ongoing":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        label: "In Progress",
        icon: PlayCircle,
      };
    case "cancelled":
      return {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-600 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-700",
        label: "Cancelled",
        icon: XCircle,
      };
    default:
      return {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800",
        label: "Pending",
        icon: Circle,
      };
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Bulk Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Priority Quick Update Menu
  const [priorityMenuTaskId, setPriorityMenuTaskId] = useState<string | null>(
    null,
  );

  // Fetch only user's custom-added categories from Firestore
  useEffect(() => {
    const fetchCategories = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "categories"),
          where("userId", "==", auth.currentUser.uid),
        );
        const snapshot = await getDocs(q);
        const customCats = snapshot.docs.map((doc) => doc.data().name);
        setCategories(["All", ...customCats]);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories(["All"]);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchCategories();
      }
    });
    return () => unsubscribe();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (activeMenuId && !target.closest(".task-menu-container")) {
        setActiveMenuId(null);
      }
      if (showSortMenu && !target.closest(".sort-menu-container")) {
        setShowSortMenu(false);
      }
      if (priorityMenuTaskId && !target.closest(".priority-menu-container")) {
        setPriorityMenuTaskId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId, showSortMenu, priorityMenuTaskId]);

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

  // Clear selection when tasks change
  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [selectedDate, statusFilter, selectedCategory, searchQuery]);

  const handlePrioritize = async () => {
    if (tasks.length === 0) return;

    setIsPrioritizing(true);
    try {
      const response = await fetch("/api/ai/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      const data = await response.json();
      if (data.tasks) {
        const prioritizedMap = new Map<string, any>(
          data.tasks.map((t: any) => [t.id, t]),
        );

        const updatedTasks = tasks.map((t) => {
          const p = prioritizedMap.get(t.id);
          return p
            ? {
                ...t,
                priority: p.priority as "low" | "medium" | "high",
                reasoning: p.reasoning,
              }
            : t;
        });

        const orderedIds = data.tasks.map((t: any) => t.id);
        const reorderedTasks = [
          ...updatedTasks
            .filter((t) => orderedIds.includes(t.id))
            .sort(
              (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id),
            ),
          ...updatedTasks.filter((t) => !orderedIds.includes(t.id)),
        ];

        setTasks(reorderedTasks);

        data.tasks.forEach((pt: any) => {
          const ref = doc(db, "tasks", pt.id);
          updateDoc(ref, {
            priority: pt.priority,
            reasoning: pt.reasoning,
          });
        });
      }
    } catch (error) {
      console.error("Prioritization failed:", error);
      alert("Failed to prioritize tasks");
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleSmartSchedule = async () => {
    if (tasks.length === 0) return;

    setIsScheduling(true);
    try {
      const response = await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, date: selectedDate }),
      });

      const data = await response.json();
      if (data.tasks) {
        const scheduledMap = new Map<string, any>(
          data.tasks.map((t: any) => [t.id, t]),
        );

        const updatedTasks = tasks.map((t) => {
          const s = scheduledMap.get(t.id);
          return s
            ? {
                ...t,
                startTime: s.startTime,
                endTime: s.endTime,
                reasoning: s.reasoning,
              }
            : t;
        });

        updatedTasks.sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || ""),
        );

        setTasks(updatedTasks);

        data.tasks.forEach((st: any) => {
          const ref = doc(db, "tasks", st.id);
          updateDoc(ref, {
            startTime: st.startTime,
            endTime: st.endTime,
            reasoning: st.reasoning,
          });
        });
      }
    } catch (error) {
      console.error("Scheduling failed:", error);
      alert("Failed to schedule tasks");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleVoiceAction = async (result: any) => {
    if (!result || !result.action) return;

    if (result.confirmation) {
      alert(result.confirmation);
    }

    switch (result.action) {
      case "CREATE_TASK":
        if (result.data && auth.currentUser) {
          try {
            const newTask = {
              title: result.data.title,
              description: "",
              date: result.data.date || selectedDate,
              startTime: result.data.startTime || "",
              endTime: "",
              category: result.data.category || "Personal",
              userId: auth.currentUser.uid,
              status: "pending",
              priority: "medium",
              deleted: false,
              createdAt: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, "tasks"), newTask);
            const taskWithId = { id: docRef.id, ...newTask } as Task;

            if (newTask.date === selectedDate) {
              setTasks((prev) => [...prev, taskWithId]);
            }
          } catch (error) {
            console.error("Error creating task from voice:", error);
          }
        }
        break;

      case "DELETE_TASK":
        if (result.data.keywords) {
          const keywords = result.data.keywords.toLowerCase();
          const taskToDelete = tasks.find((t) =>
            t.title.toLowerCase().includes(keywords),
          );
          if (taskToDelete) {
            handleDelete(taskToDelete.id);
          } else {
            alert("Could not find a task matching: " + result.data.keywords);
          }
        }
        break;

      case "PRIORITIZE_TASKS":
        handlePrioritize();
        break;

      case "SCHEDULE_TASKS":
        handleSmartSchedule();
        break;

      default:
        console.log("Unknown voice action:", result.action);
    }
  };

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

      list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      setTasks(list);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    let newStatus: Task["status"];
    if (currentStatus === "completed") {
      newStatus = "pending";
    } else if (currentStatus === "pending") {
      newStatus = "ongoing";
    } else if (currentStatus === "ongoing") {
      newStatus = "completed";
    } else {
      newStatus = "pending";
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (err) {
      console.error("Error updating task status:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: currentStatus as Task["status"] }
            : t,
        ),
      );
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: Task["status"],
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const oldStatus = task.status;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    setActiveMenuId(null);

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (err) {
      console.error("Error updating task status:", err);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)),
      );
    }
  };

  const updateTaskPriority = async (
    taskId: string,
    newPriority: Task["priority"],
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const oldPriority = task.priority;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)),
    );
    setPriorityMenuTaskId(null);
    setActiveMenuId(null);

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { priority: newPriority });
    } catch (err) {
      console.error("Error updating task priority:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, priority: oldPriority } : t,
        ),
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveMenuId(null);

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { deleted: true });
    } catch (err) {
      console.error("Error deleting task:", err);
      loadTasksForDate(selectedDate);
    }
  };

  const handleDuplicate = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !auth.currentUser) return;

    setActiveMenuId(null);

    try {
      const newTask = {
        title: `${task.title} (Copy)`,
        description: task.description || "",
        date: task.date,
        startTime: task.startTime || "",
        endTime: task.endTime || "",
        category: task.category || "Work",
        userId: auth.currentUser.uid,
        status: "pending" as const,
        priority: task.priority || "medium",
        deleted: false,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "tasks"), newTask);
      const taskWithId = { id: docRef.id, ...newTask } as Task;

      if (newTask.date === selectedDate) {
        setTasks((prev) => [...prev, taskWithId]);
      }
    } catch (error) {
      console.error("Error duplicating task:", error);
      alert("Failed to duplicate task");
    }
  };

  // Bulk Actions
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAllTasks = () => {
    if (selectedTaskIds.size === filteredAndSortedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredAndSortedTasks.map((t) => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedTaskIds.size} task(s)?`,
      )
    )
      return;

    const idsToDelete = Array.from(selectedTaskIds);
    setTasks((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));
    setSelectedTaskIds(new Set());
    setShowBulkMenu(false);

    try {
      await Promise.all(
        idsToDelete.map((id) =>
          updateDoc(doc(db, "tasks", id), { deleted: true }),
        ),
      );
    } catch (err) {
      console.error("Error in bulk delete:", err);
      loadTasksForDate(selectedDate);
    }
  };

  const handleBulkStatusChange = async (newStatus: Task["status"]) => {
    if (selectedTaskIds.size === 0) return;

    const ids = Array.from(selectedTaskIds);
    const oldTasks = tasks.map((t) => ({ ...t }));

    setTasks((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, status: newStatus } : t)),
    );
    setSelectedTaskIds(new Set());
    setShowBulkMenu(false);

    try {
      await Promise.all(
        ids.map((id) => updateDoc(doc(db, "tasks", id), { status: newStatus })),
      );
    } catch (err) {
      console.error("Error in bulk status update:", err);
      setTasks(oldTasks);
    }
  };

  const handleVoiceCommand = (result: any) => {
    handleVoiceAction(result);
  };

  // Stats Computations
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const ongoing = tasks.filter((t) => t.status === "ongoing").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const highPriority = tasks.filter((t) => t.priority === "high").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, ongoing, pending, highPriority, progress };
  }, [tasks]);

  // Filtered and Sorted Tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (selectedCategory !== "All") {
      result = result.filter(
        (t) => (t.category || "Work") === selectedCategory,
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q),
      );
    }

    const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
    const statusOrder = { ongoing: 0, pending: 1, completed: 2, cancelled: 3 };

    switch (sortBy) {
      case "priority":
        result.sort(
          (a, b) =>
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder],
        );
        break;
      case "time":
        result.sort((a, b) =>
          (a.startTime || "99:99").localeCompare(b.startTime || "99:99"),
        );
        break;
      case "status":
        result.sort(
          (a, b) =>
            statusOrder[a.status as keyof typeof statusOrder] -
            statusOrder[b.status as keyof typeof statusOrder],
        );
        break;
      case "alphabetical":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "created":
        result.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
        break;
    }

    return result;
  }, [tasks, selectedCategory, statusFilter, searchQuery, sortBy]);

  const statusTabs: {
    key: StatusFilter;
    label: string;
    count: number;
    icon: any;
  }[] = [
    { key: "all", label: "All", count: stats.total, icon: ListTodo },
    { key: "pending", label: "Pending", count: stats.pending, icon: Circle },
    {
      key: "ongoing",
      label: "In Progress",
      count: stats.ongoing,
      icon: PlayCircle,
    },
    {
      key: "completed",
      label: "Completed",
      count: stats.completed,
      icon: CheckCircle2,
    },
  ];

  const sortOptions: { key: SortOption; label: string; icon: any }[] = [
    { key: "priority", label: "By Priority", icon: Flag },
    { key: "time", label: "By Time", icon: Clock },
    { key: "status", label: "By Status", icon: Filter },
    { key: "alphabetical", label: "A - Z", icon: SortAsc },
    { key: "created", label: "Recently Added", icon: CalendarIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Task Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            My Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
            {dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <VoiceCommand onCommand={handleVoiceCommand} />
          <Link
            href="/dashboard/tasks/new"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 font-medium active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Total Tasks
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
              <Circle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.pending}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Pending
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.ongoing}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            In Progress
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.completed}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Completed
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
              {stats.progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 font-medium">
            Completion Rate
          </div>
        </div>
      </div>

      {/* AI Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSmartSchedule}
          disabled={isScheduling || tasks.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 font-medium text-sm"
        >
          {isScheduling ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Clock size={18} />
          )}
          <span>{isScheduling ? "Scheduling..." : "Smart Schedule"}</span>
        </button>
        <button
          onClick={handlePrioritize}
          disabled={isPrioritizing || tasks.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 font-medium text-sm"
        >
          {isPrioritizing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          <span>
            {isPrioritizing ? "Prioritizing..." : "Prioritize with AI"}
          </span>
        </button>
      </div>

      {/* Date Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Search + Sort Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, description, or category..."
            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 focus:border-purple-500/50 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative sort-menu-container">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <ArrowUpDown size={16} />
            <span>
              Sort: {sortOptions.find((o) => o.key === sortBy)?.label}
            </span>
          </button>

          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-1.5">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortBy(opt.key);
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      sortBy === opt.key
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <opt.icon
                      size={16}
                      className={
                        sortBy === opt.key ? "text-purple-500" : "text-gray-400"
                      }
                    />
                    <span className="flex-1 text-left">{opt.label}</span>
                    {sortBy === opt.key && (
                      <Check size={16} className="text-purple-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Icon size={15} className={isActive ? "text-purple-500" : ""} />
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Categories Bar - only show when user has custom categories */}
      {categories.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Filter size={15} />
              Filter by Category
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const style = cat === "All" ? null : getCategoryStyle(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/30 scale-105"
                      : style
                        ? `${style.bg} ${style.text} ${style.border} border hover:shadow-sm`
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat !== "All" && style && (
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div className="sticky top-4 z-30 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 shadow-xl shadow-purple-500/25 animate-in slide-in-from-top duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Check size={18} />
              </div>
              <div>
                <span className="font-bold text-base">
                  {selectedTaskIds.size}
                </span>
                <span className="text-white/80 text-sm ml-1.5">
                  task{selectedTaskIds.size > 1 ? "s" : ""} selected
                </span>
              </div>
            </div>
            <div className="relative flex-wrap flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange("pending")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Circle size={15} />
                Pending
              </button>
              <button
                onClick={() => handleBulkStatusChange("ongoing")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <PlayCircle size={15} />
                Start
              </button>
              <button
                onClick={() => handleBulkStatusChange("completed")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle2 size={15} />
                Complete
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
              <button
                onClick={() => setSelectedTaskIds(new Set())}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-sm font-medium transition-colors"
              >
                <X size={15} />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {/* Select All Bar */}
        {!loading && filteredAndSortedTasks.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1">
            <label className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedTaskIds.size === filteredAndSortedTasks.length &&
                  filteredAndSortedTasks.length > 0
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-300 dark:border-gray-600 group-hover:border-purple-400"
                }`}
                onClick={selectAllTasks}
              >
                {selectedTaskIds.size === filteredAndSortedTasks.length &&
                  filteredAndSortedTasks.length > 0 && (
                    <Check size={13} className="text-white" />
                  )}
              </div>
              <span
                className="font-medium cursor-pointer select-none"
                onClick={selectAllTasks}
              >
                {selectedTaskIds.size === filteredAndSortedTasks.length &&
                filteredAndSortedTasks.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </span>
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              Showing {filteredAndSortedTasks.length} of {tasks.length} task
              {tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Loading tasks...
            </p>
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-gray-100 dark:border-gray-800">
              {searchQuery ||
              statusFilter !== "all" ||
              selectedCategory !== "All" ? (
                <Filter className="w-9 h-9 text-gray-400" />
              ) : (
                <CalendarIcon className="w-9 h-9 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
              {searchQuery ||
              statusFilter !== "all" ||
              selectedCategory !== "All"
                ? "No matching tasks"
                : "No tasks for this day"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {searchQuery ||
              statusFilter !== "all" ||
              selectedCategory !== "All"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Start your day right by adding your first task and stay organized!"}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/dashboard/tasks/new"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5"
              >
                <Plus size={17} />
                <span>Create Task</span>
              </Link>
              {(searchQuery ||
                statusFilter !== "all" ||
                selectedCategory !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSelectedCategory("All");
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTasks.map((task, idx) => {
              const priorityStyle = getPriorityStyle(task.priority || "none");
              const statusStyle = getStatusStyle(task.status);
              const categoryStyle = getCategoryStyle(task.category || "Work");
              const StatusIcon = statusStyle.icon;
              const isSelected = selectedTaskIds.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`group relative flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? "border-purple-400 dark:border-purple-600 ring-4 ring-purple-100 dark:ring-purple-900/30 shadow-lg shadow-purple-500/10"
                      : task.status === "completed"
                        ? "border-gray-100 dark:border-gray-800 opacity-70"
                        : "border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                        isSelected
                          ? "bg-purple-600 border-purple-600"
                          : "border-gray-300 dark:border-gray-600 hover:border-purple-400 opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={() => toggleTaskSelection(task.id)}
                    >
                      {isSelected && <Check size={13} className="text-white" />}
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleTaskStatus(task.id, task.status)}
                    className={`pt-0.5 flex-shrink-0 transition-all group/toggle ${
                      task.status === "completed"
                        ? "text-green-500"
                        : task.status === "ongoing"
                          ? "text-blue-500"
                          : "text-gray-300 hover:text-purple-500"
                    }`}
                    title={`Click to change status (current: ${statusStyle.label})`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 size={25} className="fill-current" />
                    ) : task.status === "ongoing" ? (
                      <PlayCircle
                        size={25}
                        className="fill-current fill-opacity-20"
                      />
                    ) : (
                      <Circle size={25} />
                    )}
                  </button>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <h3
                          className={`text-base font-semibold transition-all truncate ${
                            task.status === "completed"
                              ? "text-gray-400 line-through"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {task.title}
                        </h3>
                        {/* Category Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${categoryStyle.dot}`}
                          />
                          {task.category || "Work"}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <StatusIcon size={11} />
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Quick Priority Button */}
                      <div className="relative priority-menu-container flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPriorityMenuTaskId(
                              priorityMenuTaskId === task.id ? null : task.id,
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} hover:ring-2 hover:${priorityStyle.ring}`}
                          title="Change priority"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${priorityStyle.dot}`}
                          />
                          {priorityStyle.label}
                        </button>

                        {priorityMenuTaskId === task.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <div className="p-1">
                              {(["high", "medium", "low"] as const).map((p) => {
                                const ps = getPriorityStyle(p);
                                return (
                                  <button
                                    key={p}
                                    onClick={() =>
                                      updateTaskPriority(task.id, p)
                                    }
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                                      task.priority === p
                                        ? ps.bg + " " + ps.text + " font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full ${ps.dot}`}
                                    />
                                    {ps.label} Priority
                                    {task.priority === p && (
                                      <Check size={14} className="ml-auto" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                      {task.startTime && (
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <Clock size={14} className="text-purple-500" />
                          <span className="font-medium">
                            {task.startTime}
                            {task.endTime && ` - ${task.endTime}`}
                          </span>
                        </div>
                      )}

                      {task.reasoning && (
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/15 px-2.5 py-1 rounded-lg border border-purple-100 dark:border-purple-900/30 max-w-full">
                          <Sparkles size={12} className="flex-shrink-0" />
                          <span className="text-xs italic truncate">
                            {task.reasoning}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* More Menu */}
                  <div className="relative task-menu-container flex-shrink-0 pt-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === task.id ? null : task.id,
                        );
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={19} />
                    </button>

                    {activeMenuId === task.id && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-1.5">
                          <Link
                            href={`/dashboard/tasks/edit/${task.id}`}
                            onClick={() => setActiveMenuId(null)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                          >
                            <Edit size={16} className="text-gray-400" />
                            Edit Task
                          </Link>
                          <button
                            onClick={() => handleDuplicate(task.id)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                          >
                            <Copy size={16} className="text-gray-400" />
                            Duplicate Task
                          </button>

                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />

                          {/* Status Submenu */}
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Change Status
                          </div>
                          {(
                            [
                              "pending",
                              "ongoing",
                              "completed",
                              "cancelled",
                            ] as const
                          ).map((s) => {
                            const ss = getStatusStyle(s);
                            const SI = ss.icon;
                            return (
                              <button
                                key={s}
                                onClick={() => updateTaskStatus(task.id, s)}
                                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                                  task.status === s
                                    ? ss.bg + " " + ss.text + " font-medium"
                                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                              >
                                <SI
                                  size={15}
                                  className={
                                    task.status === s ? "" : "text-gray-400"
                                  }
                                />
                                {ss.label}
                              </button>
                            );
                          })}

                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />
                          <button
                            onClick={() => {
                              handleDelete(task.id);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={16} />
                            Delete Task
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
