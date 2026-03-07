"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Bell, Check, X, Users, Loader2 } from "lucide-react";
import { useSidebar } from "@/app/dashboard/SidebarContext";
import { auth, db } from "../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

import Link from "next/link";

interface Invite {
  id: string;
  teamId: string;
  role: string;
  status: string;
  teamName?: string;
}

export default function Topbar() {
  const { openSidebar } = useSidebar();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user || !user.email) {
        setInvites([]);
        setLoading(false);
        return;
      }

      // Listen for pending invites
      const q = query(
        collection(db, "team_members"),
        where("email", "==", user.email),
        where("status", "==", "pending"),
      );

      const unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
        const newInvites: Invite[] = [];

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          let teamName = "Unknown Team";

          // Fetch team name
          if (data.teamId) {
            try {
              const teamDoc = await getDoc(doc(db, "teams", data.teamId));
              if (teamDoc.exists()) {
                teamName = teamDoc.data().name;
              }
            } catch (err) {
              console.error("Error fetching team details", err);
            }
          }

          newInvites.push({
            id: docSnapshot.id,
            teamId: data.teamId,
            role: data.role,
            status: data.status,
            teamName,
          });
        }

        setInvites(newInvites);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <button
          onClick={openSidebar}
          className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
        >
          <Menu size={24} />
        </button>
        <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 lg:hidden">
          TaskMate
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto relative">
        <Link
          href="/dashboard/notifications"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          {invites.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Link>
      </div>
    </header>
  );
}
