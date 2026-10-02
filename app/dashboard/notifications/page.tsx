"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  Trash2,
  Check,
  X,
  Users,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  addDoc,
  increment,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "invite" | "task_assigned" | "task_completed" | "mention" | "system";
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
  data?: any; // For storing related IDs (teamId, taskId, etc.)
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // 1. Listen for Team Invites (simulating them as notifications)
      const invitesQuery = query(
        collection(db, "team_members"),
        where("email", "==", user.email),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );

      const unsubInvites = onSnapshot(invitesQuery, async (snapshot) => {
        const inviteNotifications: Notification[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let teamName = "Unknown Team";

          if (data.teamId) {
            try {
              const teamDoc = await getDoc(doc(db, "teams", data.teamId));
              if (teamDoc.exists()) teamName = teamDoc.data().name;
            } catch (e) {
              console.error(e);
            }
          }

          inviteNotifications.push({
            id: docSnap.id,
            type: "invite",
            title: "Team Invitation",
            message: `You have been invited to join team "${teamName}" as ${data.role}`,
            createdAt: data.createdAt || Timestamp.now(),
            read: false,
            data: { teamId: data.teamId, inviteId: docSnap.id },
          });
        }

        // Merge with other notifications (placeholder for now)
        // In a real app, you'd have a 'notifications' collection
        setNotifications((prev) => {
          // Filter out old invites to avoid duplicates if we were persisting them differently
          const others = prev.filter((n) => n.type !== "invite");
          return [...inviteNotifications, ...others].sort(
            (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
          );
        });
        setLoading(false);
      });

      return () => unsubInvites();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    // In a real app, update Firestore 'read' status
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleClearAll = () => {
    // In real app, batch delete or update
    setNotifications([]);
  };

  const handleAcceptInvite = async (notification: Notification) => {
    try {
      if (!auth.currentUser) {
        alert("You must be logged in to accept invites.");
        return;
      }

      if (!notification.data?.inviteId) {
        alert("Invalid invitation data.");
        return;
      }

      const inviteRef = doc(db, "team_members", notification.data.inviteId);

      await updateDoc(inviteRef, {
        status: "active",
        userId: auth.currentUser.uid,
        joinedAt: new Date().toISOString(),
      });

      // Update team member count
      if (notification.data.teamId) {
        const teamRef = doc(db, "teams", notification.data.teamId);
        await updateDoc(teamRef, {
          memberCount: increment(1),
        });
      }

      // Remove from local list immediately
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      alert("Invitation accepted! You have joined the team.");
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      alert("Failed to accept invite: " + (error.message || "Unknown error"));
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    try {
      if (!notification.data?.inviteId) return;
      await deleteDoc(doc(db, "team_members", notification.data.inviteId));
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    } catch (error) {
      console.error("Error declining invite:", error);
      alert("Failed to decline invite");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "invite":
        return Users;
      case "task_assigned":
        return Calendar;
      case "task_completed":
        return CheckCircle2;
      case "mention":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "invite":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/30";
      case "task_assigned":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "task_completed":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "mention":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : !n.read,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Stay updated with your tasks and team activities.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleClearAll()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === "all"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === "unread"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          Unread
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No notifications
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = getIcon(notification.type);
            const colorClass = getColor(notification.type);

            return (
              <div
                key={notification.id}
                className={`group relative p-5 rounded-2xl border transition-all duration-200 ${
                  notification.read
                    ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-75"
                    : "bg-white dark:bg-gray-900 border-purple-100 dark:border-purple-900/50 shadow-sm"
                }`}
              >
                <div className="flex gap-4">
                  <div className={`p-3 rounded-xl h-fit ${colorClass}`}>
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3
                        className={`font-semibold text-gray-900 dark:text-white ${!notification.read && "pr-8"}`}
                      >
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatDistanceToNow(notification.createdAt.toDate() ?? new Date(),
                         {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                      {notification.message}
                    </p>

                    {notification.type === "invite" && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => handleAcceptInvite(notification)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Check size={16} /> Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(notification)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        >
                          <X size={16} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!notification.read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="absolute top-5 right-5 w-2.5 h-2.5 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
                    title="Mark as read"
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
