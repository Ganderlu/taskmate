import { Suspense } from "react";
import CreateTaskPage from "./CreateTaskPage";

export default function AddTaskPage() {
  return (
    <Suspense fallback={<p className="p-4">Loading...</p>}>
      <CreateTaskPage />
    </Suspense>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import { db, auth } from "../firebase/firebaseClient";
// import {
//   addDoc,
//   doc,
//   updateDoc,
//   deleteDoc,
//   getDoc,
//   collection,
//   serverTimestamp,
// } from "firebase/firestore";
// import { useRouter, useSearchParams } from "next/navigation";
// import dayjs from "dayjs";
// import { Upload } from "lucide-react";
// import { Suspense } from "react";

// export default function CreateTaskPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const taskId = searchParams.get("id");

//   const user = auth.currentUser;

//   const [loadingTask, setLoadingTask] = useState(true);
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));
//   const [startTime, setStartTime] = useState("16:00");
//   const [endTime, setEndTime] = useState("19:00");
//   const [category, setCategory] = useState("Work");

//   // Load task if editing
//   useEffect(() => {
//     if (!taskId) {
//       setLoadingTask(false);
//       return;
//     }

//     const loadTask = async () => {
//       const ref = doc(db, "tasks", taskId);
//       const snap = await getDoc(ref);

//       if (snap.exists()) {
//         const t = snap.data();
//         setTitle(t.title || "");
//         setDescription(t.description || "");
//         setTaskDate(t.date || dayjs().format("YYYY-MM-DD"));
//         setStartTime(t.startTime || "09:00");
//         setEndTime(t.endTime || "10:00");
//         setCategory(t.category || "Work");
//       }

//       setLoadingTask(false);
//     };

//     loadTask();
//   }, [taskId]);

//   // Create new task
//   const handleCreateTask = async () => {
//     if (!user) return alert("User not logged in");
//     if (!title.trim()) return alert("Title is required");

//     await addDoc(collection(db, "tasks"), {
//       title,
//       description,
//       date: taskDate,
//       startTime,
//       endTime,
//       category,
//       userId: user.uid,
//       createdAt: serverTimestamp(),
//     });

//     router.push("/tasks");
//   };

//   // Update task
//   const handleUpdateTask = async () => {
//   if (!taskId) {
//     alert("Invalid task ID");
//     return;
//   }

//   const ref = doc(db, "tasks", taskId as string);

//   await updateDoc(ref, {
//     title,
//     description,
//     date: taskDate,
//     startTime,
//     endTime,
//     category,
//   });

//   router.push("/dashboard");
// };

//   // const handleUpdateTask = async () => {
//   //   if (!title.trim()) return alert("Title is required");

//   //   const ref = doc(db, "tasks", taskId);

//   //   await updateDoc(ref, {
//   //     title,
//   //     description,
//   //     date: taskDate,
//   //     startTime,
//   //     endTime,
//   //     category,
//   //   });

//   //   router.push("/tasks");
//   // };

//   // Delete task
//   const handleDeleteTask = async () => {
//     if (!taskId) return;

//     await deleteDoc(doc(db, "tasks", taskId));
//     router.push("/tasks");
//   };

//   if (loadingTask) return <p className="p-4">Loading task...</p>;

//   return (
//     <div className="p-4 sm:p-6 bg-white lg:p-10 w-full max-w-5xl mx-auto">
//       {/* HEADER */}
//       <div className="flex justify-between text-black items-center">
//         <h1 className="text-2xl font-semibold">
//           {taskId ? "Edit Task" : "Create New Task"}
//         </h1>
//         <Upload className="text-gray-600" size={24} />
//       </div>

//       {/* TOP INPUT - EDITABLE TITLE */}
//       <div className="mt-4 bg-blue-50 p-3 rounded-lg flex items-center gap-3">
//         <Upload size={20} className="text-gray-400" />
//         <input
//           placeholder="Enter task title..."
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           className="w-full bg-transparent outline-none text-gray-700 text-lg"
//         />
//       </div>

//       {/* TITLE + DATE */}
//       <div className="mt-6">
//         <p className="text-blue-600 font-semibold">Title:</p>

//         {/* Editable Title - Not Preview */}
//         <input
//           type="text"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           placeholder="Enter title..."
//           className="border-b pb-2 w-full bg-transparent outline-none"
//         />

//         <p className="mt-4 text-blue-600 font-semibold">Date:</p>
//         <input
//           type="date"
//           value={taskDate}
//           onChange={(e) => setTaskDate(e.target.value)}
//           className="border-b w-full pb-2 bg-transparent"
//         />
//       </div>

//       {/* BLUE AREA */}
//       <div className="mt-8 text-black bg-blue-50 p-6 rounded-3xl w-full">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//           {/* LEFT */}
//           <div>
//             <label className="font-semibold">Start Time:</label>
//             <input
//               type="time"
//               value={startTime}
//               onChange={(e) => setStartTime(e.target.value)}
//               className="block w-full border-b bg-transparent mt-1"
//             />

//             <label className="font-semibold mt-4 block">End Time:</label>
//             <input
//               type="time"
//               value={endTime}
//               onChange={(e) => setEndTime(e.target.value)}
//               className="block w-full border-b bg-transparent mt-1"
//             />

//             <p className="mt-6 font-semibold">Category:</p>
//             <div className="flex gap-3 mt-2 flex-wrap">
//               {["Work", "Personal", "School"].map((cat) => (
//                 <button
//                   key={cat}
//                   onClick={() => setCategory(cat)}
//                   className={`px-5 py-2 rounded-lg shadow-md font-medium ${
//                     category === cat
//                       ? "bg-purple-500 text-white"
//                       : "bg-gray-200 text-gray-700"
//                   }`}
//                 >
//                   {cat}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* RIGHT */}
//           <div>
//             <label className="font-semibold">Description:</label>
//             <textarea
//               rows={6}
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               className="w-full mt-2 border bg-transparent rounded-lg p-2"
//             />
//           </div>
//         </div>

//         {/* BUTTONS */}
//         <div className="flex gap-5 mt-6">
//           {taskId && (
//             <button
//               onClick={handleDeleteTask}
//               className="px-6 py-2 bg-red-200 text-red-700 rounded-lg"
//             >
//               Delete Task
//             </button>
//           )}

//           <button
//             onClick={taskId ? handleUpdateTask : handleCreateTask}
//             className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-md"
//           >
//             {taskId ? "Update Task" : "Save Task"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
