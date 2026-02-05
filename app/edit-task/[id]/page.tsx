"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseClient";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";

export default function EditTaskPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");

  // 🔹 Load existing task
  useEffect(() => {
    const loadTask = async () => {
      if (!id) return;

      const ref = doc(db, "tasks", id as string);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Task not found");
        router.push("/dashboard/tasks");
        return;
      }

      const data = snap.data();

      setTitle(data.title || "");
      setDescription(data.description || "");
      setDate(data.date || dayjs().format("YYYY-MM-DD"));
      setStartTime(data.startTime || "");
      setEndTime(data.endTime || "");
      setCategory(data.category || "");

      setLoading(false);
    };

    loadTask();
  }, [id, router]);

  // 🔹 Save updates
  const handleUpdate = async () => {
    await updateDoc(doc(db, "tasks", id as string), {
      title,
      description,
      date,
      startTime,
      endTime,
      category,
    });

    router.push("/dashboard/tasks");
  };

  if (loading) return <p>Loading task...</p>;

  return (
    <div className="max-w-xl text-black mx-auto p-6 bg-white">
      <h2 className="text-xl font-bold mb-4">Edit Task</h2>

      <input
        className="w-full border p-2 mb-3"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full border p-2 mb-3"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="date"
        className="w-full border p-2 mb-3"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="flex gap-3 mb-3">
        <input
          type="time"
          className="w-full border p-2"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          className="w-full border p-2"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      <input
        className="w-full border p-2 mb-4"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <button
        onClick={handleUpdate}
        className="w-full bg-purple-600 text-white py-2 rounded"
      >
        Save Changes
      </button>
    </div>
  );
}
