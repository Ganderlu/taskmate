"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  Check,
  X,
  Users,
  Loader2,
  Search,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Mic,
  Sun,
  Moon,
  LogOut,
  Settings as SettingsIcon,
  HelpCircle,
  User,
  Sparkles,
  Clock,
  CalendarDays,
  Zap,
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  FileText,
  Briefcase,
  Mail,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  CheckSquare,
  FolderKanban,
} from "lucide-react";
import { useSidebar } from "@/app/dashboard/SidebarContext";
import { auth, db, storage } from "../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { updateProfile, User as FirebaseUser } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import dayjs from "dayjs";

interface Invite {
  id: string;
  teamId: string;
  role: string;
  status: string;
  teamName?: string;
  createdAt?: any;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const PAGE_BREADCRUMBS: Record<string, { label: string; icon: any }> = {
  "/dashboard": { label: "Dashboard", icon: Briefcase },
  "/dashboard/tasks": { label: "Tasks", icon: FileText },
  "/dashboard/tasks/new": { label: "New Task", icon: Plus },
  "/dashboard/teams": { label: "Teams", icon: Users },
  "/dashboard/teams/edit": { label: "Permissions", icon: CheckCircle2 },
  "/dashboard/team": { label: "Team Workspace", icon: Users },
  "/dashboard/notifications": { label: "Notifications", icon: Bell },
  "/dashboard/storage": { label: "Storage", icon: FileText },
  "/dashboard/invite": { label: "Invite", icon: Mail },
  "/dashboard/settings": { label: "Settings", icon: SettingsIcon },
  "/dashboard/privacy": { label: "Privacy", icon: MessageCircle },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Still up", emoji: "🌙" };
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (h < 21) return { text: "Good evening", emoji: "🌆" };
  return { text: "Good night", emoji: "🌙" };
}

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openSidebar, collapsed, toggleCollapsed } = useSidebar();
  const { theme, setTheme } = useTheme();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  // User state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profileImage, setProfileImage] = useState<string>("/gander.jpg");

  // UI toggles
  const [showInvites, setShowInvites] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const invitesRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const greeting = mounted ? getGreeting() : { text: "Hello", emoji: "👋" };
  const breadcrumb = PAGE_BREADCRUMBS[pathname || ""] || null;

  /* ---------- Theme (mount first to prevent SSR hydration mismatch) ---------- */
  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTheme = mounted ? theme : "light";

  const toggleDark = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  /* ---------- Auth + invites listener ---------- */
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((fUser) => {
      setUser(fUser);
      if (fUser) {
        setProfileImage(fUser.photoURL || "/gander.jpg");
      }

      if (!fUser || !fUser.email) {
        setInvites([]);
        setLoading(false);
        return;
      }

      // Pending invites for this email
      const q = query(
        collection(db, "team_members"),
        where("email", "==", fUser.email),
        where("status", "==", "pending"),
      );

      const unsubSnap = onSnapshot(q, async (snapshot) => {
        const newInvites: Invite[] = [];
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          let teamName = "Unknown Team";
          if (data.teamId) {
            try {
              const teamDoc = await getDoc(doc(db, "teams", data.teamId));
              if (teamDoc.exists()) {
                teamName = teamDoc.data().name;
              }
            } catch {
              /* ignore */
            }
          }
          newInvites.push({
            id: docSnapshot.id,
            teamId: data.teamId,
            role: data.role,
            status: data.status,
            teamName,
            createdAt: data.createdAt,
          });
        }
        setInvites(newInvites);
        setLoading(false);
      });

      const oldCleanup = () => unsubSnap();
      return () => oldCleanup();
    });

    return () => unsubscribeAuth();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        invitesRef.current &&
        !invitesRef.current.contains(e.target as Node)
      ) {
        setShowInvites(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------- Real Search: tasks + teams + categories ---------- */
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    setSearching(true);

    const doSearch = async () => {
      const results: any[] = [];
      const userId = user.uid;

      // 1. Search tasks
      try {
        const today = new Date();
        const tasksQuery = query(
          collection(db, "tasks"),
          where("userId", "==", userId),
          where("deleted", "==", false),
        );
        const tasksSnap = await getDocs(tasksQuery);
        tasksSnap.docs.forEach((d) => {
          const data = d.data();
          const title = (data.title || "").toLowerCase();
          const desc = (data.description || "").toLowerCase();
          if (title.includes(q) || desc.includes(q)) {
            let prio = 0;
            if (title.startsWith(q)) prio = 3;
            else if (title.includes(q)) prio = 2;
            else if (desc.includes(q)) prio = 1;
            results.push({
              id: d.id,
              type: "task",
              title: data.title || "Untitled",
              subtitle: data.description
                ? data.description.slice(0, 70)
                : dayjs(data.dueDate || data.createdAt).format("MMM D, YYYY"),
              href: data.dueDate
                ? `/dashboard/tasks?date=${encodeURIComponent(data.dueDate)}`
                : "/dashboard/tasks",
              priority: prio,
              badge:
                data.status === "completed"
                  ? "Completed"
                  : data.status === "ongoing"
                    ? "Ongoing"
                    : "Pending",
              badgeColor:
                data.status === "completed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : data.status === "ongoing"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            });
          }
        });
      } catch (e) {
        // silent
      }

      // 2. Search categories (custom ones user added)
      try {
        const catQuery = query(
          collection(db, "categories"),
          where("userId", "==", userId),
        );
        const catSnap = await getDocs(catQuery);
        catSnap.docs.forEach((d) => {
          const name = (d.data().name || "").toLowerCase();
          if (name.includes(q)) {
            results.push({
              id: d.id,
              type: "category",
              title: d.data().name,
              subtitle: "Filter tasks by this category",
              href: "/dashboard/tasks",
              priority: name.startsWith(q) ? 3 : 1,
              badge: "Category",
              badgeColor:
                "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
            });
          }
        });
      } catch (e) {
        // silent
      }

      // 3. Search teams (where user is member/owner)
      try {
        const teamsQuery = query(
          collection(db, "teams"),
          where("ownerId", "==", userId),
        );
        const teamsSnap = await getDocs(teamsQuery);
        teamsSnap.docs.forEach((d) => {
          const name = (d.data().name || "").toLowerCase();
          if (name.includes(q)) {
            results.push({
              id: d.id,
              type: "team",
              title: d.data().name,
              subtitle: `${d.data().memberCount || 1} member${
                (d.data().memberCount || 1) !== 1 ? "s" : ""
              }`,
              href: "/dashboard/teams",
              priority: name.startsWith(q) ? 3 : 1,
              badge: "Team",
              badgeColor:
                "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
            });
          }
        });

        // Also where user is a member via team_members
        const membersQuery = query(
          collection(db, "team_members"),
          where("userId", "==", userId),
        );
        const membersSnap = await getDocs(membersQuery);
        const teamIds = membersSnap.docs
          .map((d) => d.data().teamId)
          .filter(Boolean);
        for (const teamId of teamIds) {
          try {
            const td = await getDoc(doc(db, "teams", teamId));
            if (td.exists()) {
              const data = td.data();
              const name = (data.name || "").toLowerCase();
              if (name.includes(q) && !results.find((r) => r.id === teamId)) {
                results.push({
                  id: teamId,
                  type: "team",
                  title: data.name,
                  subtitle: `${data.memberCount || 1} member${
                    (data.memberCount || 1) !== 1 ? "s" : ""
                  }`,
                  href: "/dashboard/teams",
                  priority: name.startsWith(q) ? 3 : 1,
                  badge: "Team",
                  badgeColor:
                    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
                });
              }
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        // silent
      }

      // Sort by priority desc, take top 8
      results.sort((a, b) => b.priority - a.priority);
      setSearchResults(results.slice(0, 8));
      setSearching(false);
    };

    const timeoutId = setTimeout(doSearch, 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  // ⌘K / Ctrl+K global focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchFocused(true);
        const input = document.getElementById(
          "topbar-search-input",
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        setShowInvites(false);
        setShowProfileMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ---------- Invite actions ---------- */
  const acceptInvite = async (inv: Invite) => {
    if (!user) return;
    setAccepting(inv.id);
    try {
      await updateDoc(doc(db, "team_members", inv.id), {
        status: "accepted",
        userId: user.uid,
        joinedAt: new Date().toISOString(),
      });
      setInvites((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status: "accepted" } : i)),
      );
      router.push("/dashboard/teams");
    } catch {
      alert("Failed to accept invite");
    } finally {
      setAccepting(null);
    }
  };

  const declineInvite = async (inv: Invite) => {
    if (!confirm(`Decline invite to ${inv.teamName}?`)) return;
    setDeclining(inv.id);
    try {
      await deleteDoc(doc(db, "team_members", inv.id));
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    } catch {
      alert("Failed to decline invite");
    } finally {
      setDeclining(null);
    }
  };

  /* ---------- Profile ---------- */
  const handleProfileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const imageRef = ref(storage, `profile-images/${user.uid}.jpg`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      await updateProfile(user, { photoURL: downloadURL });
      setProfileImage(downloadURL);
    } catch (err) {
      console.error("Profile image upload failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/auth/login");
    } catch {
      /* ignore */
    }
  };

  const activeInvites = invites.filter((i) => i.status === "pending");
  const totalBadges = activeInvites.length;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {/* ============= LEFT: Collapse button + Brand + Breadcrumbs ============= */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Desktop collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl transition-all group"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen
              size={17}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          ) : (
            <PanelLeftClose
              size={17}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          )}
        </button>

        {/* Mobile brand */}
        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-blue-500 lg:hidden shrink-0">
          TaskMate
        </span>

        {/* Desktop breadcrumb + greeting chip */}
        <div className="hidden lg:flex items-center gap-3">
          {breadcrumb && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-900/40">
              <breadcrumb.icon
                size={14}
                className="text-violet-600 dark:text-violet-400"
              />
              <span className="text-[12px] font-bold text-violet-700 dark:text-violet-300 tracking-wide">
                {breadcrumb.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============= CENTER: Global Search ============= */}
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <div className="w-full max-w-2xl relative" ref={searchRef}>
          {/* Search Container */}
          <div
            className={`group relative flex items-center transition-all duration-300 rounded-2xl border ${
              searchFocused
                ? "bg-white dark:bg-gray-800/80 border-violet-400 dark:border-violet-600 ring-4 ring-violet-500/15 shadow-lg shadow-violet-500/10 scale-[1.005]"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200/80 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            <Search
              size={17}
              className={`absolute left-4 transition-colors ${
                searchFocused
                  ? "text-violet-500"
                  : "text-gray-400 group-hover:text-gray-500"
              }`}
            />
            <input
              id="topbar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Delay so result clicks register before blur
                setTimeout(() => setSearchFocused(false), 150);
              }}
              placeholder={
                mounted && window.innerWidth < 640
                  ? "Search tasks, teams…"
                  : "Search tasks, teams, categories… or ⌘K"
              }
              className="w-full pl-11 sm:pl-11 pr-16 sm:pr-28 py-2.5 bg-transparent outline-none text-sm font-medium text-gray-700 dark:text-gray-200 placeholder-gray-400/80"
            />

            {/* Shortcuts & voice */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700/60 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-400 transition-colors active:scale-95"
                title="Voice search"
              >
                <Mic size={12} />
              </button>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Command size={10} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400">K</span>
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    document.getElementById("topbar-search-input")?.focus();
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchFocused && (searchQuery.trim() || searching) && (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-violet-50/80 to-transparent dark:from-violet-900/20 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <Search size={14} className="text-violet-500" />
                    {searching ? "Searching…" : "Results"}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {searching
                      ? "Matching your query…"
                      : searchResults.length === 0
                        ? `No results for "${searchQuery}"`
                        : `${searchResults.length} result${
                            searchResults.length !== 1 ? "s" : ""
                          } found`}
                  </p>
                </div>
                {searching && (
                  <Loader2 className="animate-spin w-4 h-4 text-violet-500" />
                )}
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {!searching && searchResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Search
                        size={22}
                        className="text-gray-400 dark:text-gray-500"
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Nothing here yet
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Try different keywords or clear filters
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {searchResults.map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={r.href}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors group"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            r.type === "task"
                              ? "bg-amber-50 dark:bg-amber-900/25 text-amber-600 dark:text-amber-400"
                              : r.type === "category"
                                ? "bg-violet-50 dark:bg-violet-900/25 text-violet-600 dark:text-violet-400"
                                : "bg-sky-50 dark:bg-sky-900/25 text-sky-600 dark:text-sky-400"
                          }`}
                        >
                          {r.type === "task" ? (
                            <CheckSquare size={17} />
                          ) : r.type === "category" ? (
                            <FolderKanban size={17} />
                          ) : (
                            <Users size={17} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {r.title}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${r.badgeColor}`}
                            >
                              {r.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {r.subtitle}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer tips */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <Search size={8} />
                    </kbd>
                    to open
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      Esc
                    </kbd>
                    close
                  </span>
                </div>
                <Link
                  href="/dashboard/tasks"
                  className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  See all tasks →
                </Link>
              </div>
            </div>
          )}

          {/* Quick chips */}
          <div className="hidden md:flex items-center gap-2 mt-2 pl-1 -mb-1">
            <QuickChip
              icon={Zap}
              label="High priority"
              gradient="from-amber-400 to-orange-500"
              textColor="text-amber-700 dark:text-amber-400"
            />
            <QuickChip
              icon={Clock}
              label="Today"
              gradient="from-blue-400 to-cyan-500"
              textColor="text-blue-700 dark:text-blue-400"
            />
            <QuickChip
              icon={CalendarDays}
              label="This week"
              gradient="from-violet-400 to-purple-500"
              textColor="text-violet-700 dark:text-violet-400"
            />
            <QuickChip
              icon={CheckCircle2}
              label="Completed"
              gradient="from-green-400 to-emerald-500"
              textColor="text-green-700 dark:text-green-400"
            />
          </div>
        </div>
      </div>

      {/* ============= RIGHT: Actions ============= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Hide greeting on sm, show md+ */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/70 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50">
          <span className="text-base leading-none">{greeting.emoji}</span>
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {dayjs().format("ddd, MMM D")}
            </div>
            <div className="text-[12px] font-bold text-gray-700 dark:text-gray-200 leading-tight">
              {greeting.text},{" "}
              {user?.displayName
                ? user.displayName.split(" ")[0]
                : user?.email
                  ? user.email.split("@")[0]
                  : "there"}
            </div>
          </div>
        </div>

        {/* Quick new task */}
        <Link
          href="/dashboard/tasks/new"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:-translate-y-0.5 transition-all text-xs font-bold"
        >
          <Plus size={14} />
          <span className="hidden xl:inline">New Task</span>
        </Link>

        {/* Theme toggle (uses resolvedTheme to sync with Sidebar + next-themes) */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg sm:p-2.5 sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all group active:scale-90"
          title={
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {resolvedTheme === "dark" ? (
            <Sun
              size={16}
              className="sm:w-[17px] sm:h-[17px] group-hover:rotate-12 transition-transform"
            />
          ) : (
            <Moon
              size={16}
              className="sm:w-[17px] sm:h-[17px] group-hover:-rotate-12 transition-transform"
            />
          )}
        </button>

        {/* Notifications / Invites */}
        <div className="relative" ref={invitesRef}>
          <button
            onClick={() => {
              setShowInvites((s) => !s);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-lg sm:p-2.5 sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all relative active:scale-90"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {totalBadges > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-extrabold text-white bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-lg shadow-red-500/40 border-2 border-white dark:border-gray-900">
                {totalBadges > 9 ? "9+" : totalBadges}
              </span>
            )}
            {showInvites && (
              <span className="absolute inset-0 rounded-xl bg-violet-100/50 dark:bg-violet-900/30 pointer-events-none" />
            )}
          </button>

          {/* Invites Dropdown */}
          {showInvites && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] sm:w-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 z-50">
              <div className="px-5 py-4 bg-gradient-to-r from-violet-50/80 to-transparent dark:from-violet-900/20 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={15} className="text-violet-500" />
                    Team Invites
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {loading
                      ? "Loading invites..."
                      : activeInvites.length === 0
                        ? "You're all caught up 🎉"
                        : `${activeInvites.length} pending invite${activeInvites.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowInvites(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-violet-500 mb-2" />
                    <p className="text-xs text-gray-400">Checking invites...</p>
                  </div>
                ) : activeInvites.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={28} className="text-green-500" />
                    </div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-300">
                      No pending invites
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ask team owners to send an invite link.
                    </p>
                    <Link
                      href="/dashboard/invite"
                      onClick={() => setShowInvites(false)}
                      className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <Mail size={12} /> Invite others instead
                    </Link>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {activeInvites.map((inv) => {
                      const isAccepting = accepting === inv.id;
                      const isDeclining = declining === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="group p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
                                <Briefcase size={17} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                    {inv.teamName}
                                  </p>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-400 capitalize">
                                    <Users size={9} />
                                    {ROLE_LABELS[inv.role] || inv.role}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  Invited •{" "}
                                  {inv.createdAt?.toDate
                                    ? (() => {
                                        const diffMs =
                                          Date.now() -
                                          inv.createdAt.toDate().getTime();
                                        const mins = Math.floor(diffMs / 60000);
                                        if (mins < 1) return "just now";
                                        if (mins < 60) return `${mins}m ago`;
                                        const hrs = Math.floor(mins / 60);
                                        if (hrs < 24) return `${hrs}h ago`;
                                        const days = Math.floor(hrs / 24);
                                        return `${days}d ago`;
                                      })()
                                    : "Recently"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pl-[52px]">
                            <button
                              onClick={() => acceptInvite(inv)}
                              disabled={isAccepting || isDeclining}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-green-500/25 disabled:opacity-60 transition-all"
                            >
                              {isAccepting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => declineInvite(inv)}
                              disabled={isAccepting || isDeclining}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-colors disabled:opacity-60"
                            >
                              {isDeclining ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setShowInvites(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <Bell size={13} />
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile / User Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu((s) => !s);
              setShowInvites(false);
            }}
            className={`flex items-center gap-2 pl-1 pr-2 sm:pl-1.5 sm:pr-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${
              showProfileMenu ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
          >
            <div className="relative">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-[2px] shadow-md shadow-violet-500/20">
                <div className="w-full h-full rounded-[10px] bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] sm:text-sm font-extrabold text-violet-600 dark:text-violet-400">
                      {(user?.email || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm" />
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[11px] font-extrabold text-gray-800 dark:text-white truncate max-w-[110px]">
                {user?.displayName
                  ? user.displayName
                  : user?.email
                    ? user.email.split("@")[0]
                    : "User"}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                {user?.email ? user.email.split("@")[0] : ""}
              </span>
            </div>
            <ChevronDown size={13} className="hidden sm:block text-gray-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-[300px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 z-50">
              {/* User preview */}
              <div className="relative px-5 py-5 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white overflow-hidden">
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/15 p-[2px] backdrop-blur">
                      <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-xl font-extrabold text-violet-600">
                            {(user?.email || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-[2.5px] border-white shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm truncate">
                      {user?.displayName ? user.displayName : "Welcome back"}
                    </div>
                    <div className="text-[11px] text-white/80 truncate">
                      {user?.email || "Loading..."}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors backdrop-blur"
                    >
                      <Sparkles size={10} />
                      Change avatar
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleProfileImageChange}
                    />
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className="p-2 space-y-0.5">
                <MenuLink
                  href="/dashboard"
                  icon={Briefcase}
                  label="My Dashboard"
                />
                <MenuLink
                  href="/dashboard/notifications"
                  icon={Bell}
                  label="Notifications"
                  badge={totalBadges > 0 ? totalBadges : undefined}
                />
                <MenuLink
                  href="/dashboard/privacy"
                  icon={MessageCircle}
                  label="Privacy Center"
                />
                <MenuLink
                  href="/dashboard/storage"
                  icon={FileText}
                  label="Storage & Usage"
                />
              </div>

              <div className="h-px mx-3 bg-gray-100 dark:border-gray-800 my-1" />

              <div className="p-2 space-y-0.5">
                <MenuLink
                  href="/dashboard/settings"
                  icon={SettingsIcon}
                  label="Account Settings"
                />
                <MenuLink href="/" icon={HelpCircle} label="Help & Support" />
              </div>

              <div className="p-2 border-t border-gray-100 dark:border-gray-800 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group font-bold text-sm"
                >
                  <LogOut
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ========== Subcomponents ========== */

function QuickChip({
  icon: Icon,
  label,
  gradient,
  textColor,
}: {
  icon: any;
  label: string;
  gradient: string;
  textColor: string;
}) {
  return (
    <button
      onClick={(e) => e.preventDefault()}
      className="group inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      <span
        className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-gradient-to-br ${gradient} text-white shadow-sm`}
      >
        <Icon size={9} />
      </span>
      <span className={`${textColor} opacity-90 group-hover:opacity-100`}>
        {label}
      </span>
    </button>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: any;
  label: string;
  badge?: number | string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
    >
      <Icon
        size={15}
        className="text-gray-400 dark:text-gray-500 group-hover:text-violet-500 transition-colors"
      />
      <span className="font-semibold flex-1">{label}</span>
      {badge !== undefined && (
        <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-extrabold text-white bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-sm">
          {badge}
        </span>
      )}
      <ChevronRight
        size={13}
        className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}
