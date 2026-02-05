"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { storage, auth } from "../firebase/firebaseClient";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/app/dashboard/SidebarContext";

// interface SidebarProfileProps {
//   open: boolean;
//   onClose: () => void;
// }

export default function SidebarProfile() {
  const [darkMode, setDarkMode] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("/gander.jpg");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleDark = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  /* ---------- Get email from Firebase Auth ---------- */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setEmail(user.email);
        if (user.photoURL) {
          setProfileImage(user.photoURL);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  /* ---------- Image change (local preview) ---------- */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;

      const imageRef = ref(storage, `profile-images/${userId}.jpg`);

      await uploadBytes(imageRef, file);

      const downloadURL = await getDownloadURL(imageRef);

      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      setProfileImage(downloadURL);
    } catch (error) {
      console.error("Profile image upload failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      {/* Background overlay */}
      {/* <div className="absolute inset-0 bg-black/40" onClick={onClose} /> */}

      {/* Sidebar panel */}
      <div
        className={`absolute left-0 top-0 h-full w-80 bg-white dark:bg-white shadow-xl 
       transition-transform duration-300 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700
       `}
      >
        {/* Header */}

        {/* Profile section */}
        <div className="p-4 text-center">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src={profileImage}
              className="w-24 h-24 rounded-full object-cover"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 text-xs bg-blue-600 text-white px-2 py-1 rounded-full"
            >
              Edit
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/*"
            onChange={handleImageChange}
          />

          <p className="mt-2 text-gray-500 text-sm">{email || "Loading..."}</p>
        </div>

        {/* Menu groups */}
        <div className="px-4 pt-2 bg-gray-100 space-y-4">
          {/* General */}
          <div>
            <h4 className="text-xs text-gray-400  uppercase mb-2">General</h4>
            <SidebarItem label="Account" href="/dashboard/tasks" />
            <SidebarItem label="Projects" href="/dashboard/projects" />
            <SidebarItem label="Notifications" href="/" />
            <SidebarItem label="Saved to Cloud" href="/" />
          </div>

          {/* Team */}
          <div>
            <h4 className="text-xs text-gray-400 uppercase mb-2">
              Team & Access
            </h4>
            <SidebarItem label="Set up your Team" href="/" />
            <SidebarItem label="Allow Team Edit" href="/" />
            <SidebarItem label="Storage and Data" href="/" />
          </div>

          {/* Appearance */}
          <div>
            <h4 className="text-xs text-gray-400 uppercase mb-2">Appearance</h4>
            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800 dark:text-white">
              <span>Light / Dark Mode</span>
              <button
                onClick={toggleDark}
                className="p-2 rounded-full bg-gray-300 dark:bg-gray-700"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs text-gray-400 uppercase mb-2">Support</h4>
            <SidebarItem label="Help & Feedback" href="/" />
            <SidebarItem label="Privacy" href="/" />
            <SidebarItem label="Invite a Friend" href="/" />
            <SidebarItem label="Delete Account" href="/" />
          </div>
        </div>
        <div className="p-4 sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  const { closeSidebar } = useSidebar();

  const handleClick = () => {
    router.push(href);
    closeSidebar(); // 👈 closes mobile drawer
  };

  return (
    <div
      onClick={handleClick}
      className="p-3 bg-gray-100 dark:bg-blue-100 rounded-lg mb-1 cursor-pointer 
                 hover:bg-gray-200 dark:hover:bg-blue-100 transition dark:text-black"
    >
      {label}
    </div>
  );
}
