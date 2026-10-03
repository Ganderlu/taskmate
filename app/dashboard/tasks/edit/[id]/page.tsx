"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../firebase/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, getDocs, query, where, collection } from "firebase/firestore";
import {
  Sparkles,
  Upload,
  Trash2,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Loader2,
  Save,
  Flag,
  FolderKanban,
  AlignLeft,
  ListTodo,
  PlayCircle,
  XCircle,
  Circle,
  CheckCircle2,
} from "lucide-react";
import dayjs from "dayjs";

const DEFAULT_CATEGORIES = ["Work", "Personal", "Study", "Health", "Finance"];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; active: string; dot: string }> = {
  Work: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-blue-200 dark:hover:border-blue-800", active: "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105", dot: "bg-blue-500" },
  Personal: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-emerald-200 dark:hover:border-emerald-800", active: "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105", dot: "bg-emerald-500" },
  Study: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-amber-200 dark:hover:border-amber-800", active: "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105", dot: "bg-amber-500" },
  Health: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-rose-200 dark:hover:border-rose-800", active: "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105", dot: "bg-rose-500" },
  Finance: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-cyan-200 dark:hover:border-cyan-800", active: "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105", dot: "bg-cyan-500" },
  Default: { bg: "bg-white dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", border: "border-transparent hover:border-purple-200 dark:hover:border-purple-800", active: "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105", dot: "bg-purple-500" },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Default;
}

const PRIORITY_OPTIONS = [
  {
    value: "high" as const,
    label: "High",
    description: "Urgent & Important",
    style: "bg-gradient-to-r from-red-500 to-rose-500 border-red-500 text-white shadow-lg shadow-red-500/30",
    dot: "bg-white",
    ring: "ring-4 ring-red-500/30",
  },
  {
    value: "medium" as const,
    label: "Medium",
    description: "Important",
    style: "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-lg shadow-amber-500/30",
    dot: "bg-white",
    ring: "ring-4 ring-amber-500/30",
  },
  {
    value: "low" as const,
    label: "Low",
    description: "Nice to have",
    style: "bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-500 text-white shadow-lg shadow-blue-500/30",
    dot: "bg-white",
    ring: "ring-4 ring-blue-500/30",
  },
];

const STATUS_OPTIONS = [
  { value: "pending" as const, label: "Pending", icon: Circle, style: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" },
  { value: "ongoing" as const, label: "In Progress", icon: PlayCircle, style: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  { value: "completed" as const, label: "Completed", icon: CheckCircle2, style: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  { value: "cancelled" as const, label: "Cancelled", icon: XCircle, style: "text-gray-600 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" },
];

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: taskId } = use(params);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<"pending" | "ongoing" | "completed" | "cancelled">("pending");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchCustomCategories(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCustomCategories = async (uid: string) => {
    try {
      const q = query(
        collection(db, "categories"),
        where("userId", "==", uid),
      );
      const snapshot = await getDocs(q);
      const customCats = snapshot.docs.map((doc) => doc.data().name);
      setCategories((prev) => [...new Set([...prev, ...customCats])]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch Task Data
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;
      
      try {
        const docRef = doc(db, "tasks", taskId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || "");
          setDate(data.date || dayjs().format("YYYY-MM-DD"));
          setStartTime(data.startTime || "09:00");
          setEndTime(data.endTime || "10:00");
          setCategory(data.category || "Work");
          setPriority(data.priority || "medium");
          setStatus(data.status || "pending");
          setDescription(data.description || "");
        } else {
          alert("Task not found");
          router.push("/dashboard/tasks");
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        alert("Error loading task details");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTask();
  }, [taskId, router]);

  const handleAiSuggestion = async () => {
    if (!aiPrompt.trim() || !title.trim()) {
      alert("Please enter a task title and a prompt for AI suggestions");
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: `Improve this task: Title=${title}, Description=${description}. ${aiPrompt}` 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      if (data.title && confirm(`AI suggests title: "${data.title}"\n\nApply changes?`)) {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.category) {
          setCategory(data.category);
          if (!categories.includes(data.category)) {
            setCategories((prev) => [...prev, data.category]);
          }
        }
        if (data.date) setDate(data.date);
        if (data.startTime) setStartTime(data.startTime);
        if (data.endTime) setEndTime(data.endTime);
        if (data.priority) setPriority(data.priority);
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      if (error.message.includes("API_KEY")) {
        alert("⚠️ AI Service Not Configured");
      } else {
        alert(error.message || "Failed to generate suggestions");
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }

    if (!user) {
      alert("You must be logged in to update a task");
      return;
    }

    setLoading(true);
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        title,
        date,
        startTime,
        endTime,
        category,
        priority,
        status,
        description,
        updatedAt: new Date().toISOString(),
      });

      router.push("/dashboard/tasks");
    } catch (error: any) {
      console.error("Error updating task:", error);
      alert(`Failed to update task: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      setLoading(true);
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { deleted: true });
      router.push("/dashboard/tasks");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task");
      setLoading(false);
    }
  };

  if (initialLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading task...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-white dark:bg-gray-950 p-6 md:p-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4 group">
          <button
            onClick={() => router.back()}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all hover:scale-105 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Edit Mode
              </span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Edit Task
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Update your task details and keep things on track
            </p>
          </div>
        </div>

        {/* AI Suggestions for Edit Mode */}
        <div className="relative w-full md:w-auto md:min-w-[480px] shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400">
            <Sparkles size={20} />
          </div>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isAiGenerating) {
                handleAiSuggestion();
              }
            }}
            placeholder="Ask AI to improve, expand or refactor this task..."
            className="w-full pl-14 pr-14 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 focus:border-purple-500/50 outline-none transition-all disabled:opacity-50 text-sm"
            disabled={isAiGenerating}
          />
          <button
            onClick={handleAiSuggestion}
            disabled={isAiGenerating}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg text-white hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-md shadow-purple-500/20"
            title="Get AI suggestions"
          >
            {isAiGenerating ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Upload size={17} />
            )}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-8">
        {/* Title Section */}
        <div className="group space-y-3">
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
            <AlignLeft size={17} className="text-purple-500" />
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need to accomplish?"
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20 outline-none text-xl font-semibold text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all"
          />
        </div>

        {/* Bottom Panel */}
        <div className="bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#FDF4FF] dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 rounded-[28px] p-6 md:p-10 shadow-inner border border-white/50 dark:border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Left Column */}
            <div className="space-y-10">
              {/* Status */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <ListTodo size={17} className="text-green-500" />
                  </div>
                  Current Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-sm border-2 transition-all duration-200 ${
                          isActive
                            ? opt.style + " border-2 scale-105 shadow-md"
                            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{opt.label}</span>
                        <span className="sm:hidden">{opt.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <CalendarIcon size={17} className="text-blue-500" />
                  </div>
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl outline-none text-lg font-semibold text-gray-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <Clock size={17} className="text-cyan-500" />
                  </div>
                  Time Duration
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl outline-none text-lg font-semibold text-gray-800 dark:text-white focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl outline-none text-lg font-semibold text-gray-800 dark:text-white focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <Flag size={17} className="text-orange-500" />
                  </div>
                  Priority Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isActive = priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setPriority(opt.value)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                          isActive
                            ? `${opt.style} ${opt.ring}`
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-3 h-3 rounded-full ${isActive ? opt.dot : opt.style.includes("red") ? "bg-red-400" : opt.style.includes("amber") ? "bg-amber-400" : "bg-blue-400"}`} />
                          <span className={`text-sm font-bold ${isActive ? "text-white" : "text-gray-800 dark:text-white"}`}>
                            {opt.label}
                          </span>
                        </div>
                        <p className={`text-xs ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                          {opt.description}
                        </p>
                        {isActive && (
                          <div className="absolute top-3 right-3">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <FolderKanban size={17} className="text-violet-500" />
                  </div>
                  Category
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {categories.map((cat) => {
                    const style = getCategoryStyle(cat);
                    const isActive = category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-semibold transition-all duration-200 border-2 text-sm ${
                          isActive ? style.active : `${style.bg} ${style.text} ${style.border}`
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : style.dot}`} />
                        {cat}
                        {isActive && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Description */}
            <div className="space-y-4 h-full flex flex-col">
              <label className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                  <AlignLeft size={17} className="text-pink-500" />
                </div>
                Description & Notes
              </label>
              <div className="relative flex-1 bg-white/70 dark:bg-gray-800/70 rounded-2xl border-2 border-white dark:border-gray-700/50 shadow-inner overflow-hidden">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-transparent border-none resize-none text-[15px] leading-[2.2rem] text-gray-700 dark:text-gray-300 focus:ring-0 px-6 py-4"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 2.15rem, rgba(148, 163, 184, 0.2) 2.15rem, rgba(148, 163, 184, 0.2) 2.2rem, transparent 2.2rem)",
                    backgroundAttachment: "local",
                  }}
                  placeholder="Add detailed notes, subtasks, or context here...

&#10;• Break down larger tasks
&#10;• Note important details
&#10;• List required resources
&#10;• Track progress"
                />
                <div className="absolute bottom-3 right-4 text-xs font-medium text-gray-400 dark:text-gray-500 pointer-events-none bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-lg">
                  {description.length} characters

            {/* Action Buttons */}
            <div className="lg:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-8 border-t border-gray-200/50 dark:border-gray-700/50 mt-2">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl font-semibold transition-all hover:shadow-sm group border border-gray-100 dark:border-gray-700"
              >
                <Trash2
                  size={19}
                  className="group-hover:scale-110 transition-transform"
                />
                <span>Delete Task</span>
              </button>
              <button
                onClick={handleUpdateTask}
                disabled={loading || authLoading || !user || !title.trim()}
                className="flex items-center justify-center gap-3 px-12 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={22} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
