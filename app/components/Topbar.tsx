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
  const [showDropdown, setShowDropdown] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleAccept = async (inviteId: string) => {
    if (!auth.currentUser) return;
    setProcessingId(inviteId);
    try {
      await updateDoc(doc(db, "team_members", inviteId), {
        status: "active",
        userId: auth.currentUser.uid, // Link the actual user ID
        joinedAt: new Date().toISOString(),
      });
      // UI will update automatically via onSnapshot
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      alert(
        "Failed to accept invitation: " + (error.message || "Unknown error"),
      );
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await deleteDoc(doc(db, "team_members", inviteId));
      // UI will update automatically via onSnapshot
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      alert(
        "Failed to accept invitation: " + (error.message || "Unknown error"),
      );
    }
  };

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

      <div
        className="flex items-center gap-3 ml-auto relative"
        ref={dropdownRef}
      >
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
        >
          <Bell size={20} />
          {invites.length > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                {invites.length} New
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {invites.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full h-fit">
                          <Users
                            size={16}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white mb-1">
                            You've been invited to join{" "}
                            <strong>{invite.teamName}</strong>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Role:{" "}
                            <span className="capitalize">{invite.role}</span>
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(invite.id)}
                              disabled={processingId === invite.id}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {processingId === invite.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Check size={14} /> Accept
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDecline(invite.id)}
                              disabled={processingId === invite.id}
                              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <X size={14} /> Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
