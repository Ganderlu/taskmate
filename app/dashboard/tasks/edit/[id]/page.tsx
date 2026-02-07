"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../firebase/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  Sparkles,
  Upload,
  Trash2,
  ChevronDown,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import dayjs from "dayjs";

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap params using React.use()
  const { id: taskId } = use(params);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState("Work");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        console.log("No user logged in");
      }
    });
    return () => unsubscribe();
  }, []);

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
      await updateDoc(taskRef, { deleted: true }); // Soft delete
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
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-white dark:bg-gray-950 p-6 md:p-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-4 group">
          <button
            onClick={() => router.back()}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all hover:scale-105"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Edit Task
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Update your task details
            </p>
          </div>
        </div>

        {/* AI Input (Optional - kept for consistency) */}
        <div className="relative w-full md:w-auto md:min-w-[450px] opacity-50 pointer-events-none grayscale">
           {/* Disabled for edit mode to avoid confusion, or could implement AI edit */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400">
            <Sparkles size={22} />
          </div>
          <input
            type="text"
            value={aiPrompt}
            disabled
            placeholder="AI suggestions disabled in edit mode"
            className="w-full pl-14 pr-14 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400"
          />
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-10">
        {/* Title Section */}
        <div className="group space-y-3">
          <label className="text-blue-600 dark:text-blue-400 font-semibold text-lg uppercase tracking-wide text-xs">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title here..."
            className="w-full py-3 bg-transparent border-b-2 border-gray-200 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-3xl font-medium text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 transition-colors"
          />
        </div>

        {/* Date Section */}
        <div className="group space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <label className="text-blue-600 dark:text-blue-400 font-semibold text-lg uppercase tracking-wide text-xs">
              Date
            </label>
          </div>
          <div className="relative max-w-sm">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 bg-transparent border-b-2 border-gray-200 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-xl text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            />
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] dark:from-gray-900 dark:to-gray-800/50 rounded-[32px] p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-16 shadow-inner border border-white/50 dark:border-white/5">
          {/* Left Column */}
          <div className="space-y-12">
            {/* Time Selection */}
            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm">
                  <Clock size={24} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 text-2xl font-medium text-gray-800 dark:text-white focus:border-purple-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm">
                  <Clock size={24} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 text-2xl font-medium text-gray-800 dark:text-white focus:border-purple-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-4">
              <label className="text-gray-900 dark:text-white font-bold text-xl flex items-center gap-2">
                Category
                <span className="text-xs font-normal text-gray-400 uppercase tracking-wide bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  Select one
                </span>
              </label>
              <div className="flex flex-wrap gap-3">
                {["Work", "Personal", "Study", "Health", "Finance"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 border-2 ${
                        category === cat
                          ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105"
                          : "bg-white dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-300 hover:border-purple-200 dark:hover:border-gray-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Description */}
          <div className="space-y-4 h-full flex flex-col">
            <label className="text-gray-900 dark:text-white font-bold text-xl">
              Description
            </label>
            <div className="relative flex-1 bg-white/50 dark:bg-gray-800/50 rounded-2xl p-1 border border-gray-100 dark:border-gray-700/50">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-full min-h-[300px] bg-transparent border-none resize-none text-lg leading-[3rem] text-gray-700 dark:text-gray-300 focus:ring-0 px-6 py-2"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(transparent, transparent 2.9rem, #e5e7eb 3rem)",
                  lineHeight: "3rem",
                  backgroundAttachment: "local",
                }}
                placeholder="Write detailed notes here..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-center justify-between pt-8 border-t border-gray-200/50 dark:border-gray-700/50 mt-4">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl font-semibold transition-all hover:shadow-sm group"
            >
              <Trash2
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              <span>Delete Task</span>
            </button>
            <button
              onClick={handleUpdateTask}
              disabled={loading || authLoading || !user}
              className="flex items-center gap-3 px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save size={24} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
