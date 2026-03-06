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
  Edit,
  Copy,
  Sparkles,
} from "lucide-react";
import DateSelector from "../../dateSelector";
import Link from "next/link";
import VoiceCommand from "../../../components/VoiceCommand";

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

  // Categories State
  const [categories, setCategories] = useState<string[]>([
    "All",
    "School",
    "Work",
    "Personal",
    "Business",
    "Teams",
    "Freelancer",
  ]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // Fetch custom categories
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
        setCategories((prev) => [...new Set([...prev, ...customCats])]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchCategories();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !auth.currentUser) return;

    setAddingCategory(true);
    try {
      await addDoc(collection(db, "categories"), {
        name: newCategoryName.trim(),
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      });

      setCategories((prev) => [...prev, newCategoryName.trim()]);
      setSelectedCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsAddCategoryModalOpen(false);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeMenuId &&
        !(event.target as Element).closest(".task-menu-container")
      ) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

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
        // Update local state with new priorities and order
        // Create a map for O(1) lookup
        const prioritizedMap = new Map(data.tasks.map((t: any) => [t.id, t]));

        const updatedTasks = tasks.map((t) => {
          const p = prioritizedMap.get(t.id);
          return p ? { ...t, priority: p.priority, reasoning: p.reasoning } : t;
        });

        // Sort based on the returned order
        const orderedTasks = data.tasks
          .map((pt: any) => updatedTasks.find((t) => t.id === pt.id))
          .filter(Boolean) as Task[];

        // Append any tasks that weren't in the AI response (safety fallback)
        const missingTasks = updatedTasks.filter(
          (t) => !prioritizedMap.has(t.id),
        );

        setTasks([...orderedTasks, ...missingTasks]);

        // Optional: Update Firestore in background
        data.tasks.forEach((pt: any) => {
          const ref = doc(db, "tasks", pt.id);
          updateDoc(ref, { priority: pt.priority });
        });
      }
    } catch (error) {
      console.error("Prioritization failed:", error);
      alert("Failed to prioritize tasks");
    } finally {
      setIsPrioritizing(false);
    }
  };

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
        // Create a map for O(1) lookup
        const prioritizedMap = new Map(data.tasks.map((t: any) => [t.id, t]));

        // Update priorities locally
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

        // Reorder tasks based on AI response
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

        // Update Firestore in background
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
        // Create map for O(1) lookup
        const scheduledMap = new Map(data.tasks.map((t: any) => [t.id, t]));

        // Update local tasks
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

        // Sort by start time
        updatedTasks.sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || ""),
        );

        setTasks(updatedTasks);

        // Update Firestore
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

            // Only add to current view if date matches
            if (newTask.date === selectedDate) {
              setTasks((prev) => [...prev, taskWithId]);
            }
          } catch (error) {
            console.error("Error creating task from voice:", error);
          }
        }
        break;

      case "DELETE_TASK":
        // This is tricky as we need to find the task. For now, maybe just filter current view.
        if (result.data.keywords) {
          const keywords = result.data.keywords.toLowerCase();
          const taskToDelete = tasks.find((t) =>
            t.title.toLowerCase().includes(keywords),
          );
          if (taskToDelete) {
            handleDeleteTask(taskToDelete.id);
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

  const handleVoiceCommand = (result: any) => {
    handleVoiceAction(result);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your daily schedule
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <VoiceCommand onCommand={handleVoiceCommand} />
          <Link
            href="/dashboard/tasks/new"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
          >
            <Plus size={20} />
            <span>Add Task</span>
          </Link>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSmartSchedule}
          disabled={isScheduling || tasks.length === 0}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20"
        >
          {isScheduling ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Clock size={20} />
          )}
          <span>{isScheduling ? "Scheduling..." : "Smart Schedule"}</span>
        </button>
        <button
          onClick={handlePrioritize}
          disabled={isPrioritizing || tasks.length === 0}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
        >
          {isPrioritizing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Sparkles size={20} />
          )}
          <span>
            {isPrioritizing ? "Prioritizing..." : "Prioritize with AI"}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Categories Bar */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Categories
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-blue-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setIsAddCategoryModalOpen(true)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Plus size={16} />
            <span>Add New</span>
          </button>
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add New Category
            </h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category Name (e.g. Design)"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 focus:ring-2 focus:ring-purple-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {addingCategory ? "Adding..." : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {tasks
              .filter(
                (task) =>
                  selectedCategory === "All" ||
                  (task.category || "Work") === selectedCategory,
              )
              .map((task) => (
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
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
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
                    {task.reasoning && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 italic flex items-center gap-1 bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-900/20">
                        <Sparkles size={12} className="flex-shrink-0" />
                        {task.reasoning}
                      </p>
                    )}
                  </div>

                  <div className="relative task-menu-container">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === task.id ? null : task.id,
                        );
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenuId === task.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1">
                          <Link
                            href={`/dashboard/tasks/edit/${task.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                          >
                            <Edit size={16} />
                            Edit Task
                          </Link>
                          <button
                            onClick={() => {
                              alert("Duplicate feature coming soon!");
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                          >
                            <Copy size={16} />
                            Duplicate
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                          <button
                            onClick={() => {
                              handleDelete(task.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
