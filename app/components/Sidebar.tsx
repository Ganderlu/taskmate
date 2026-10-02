"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Settings,
  LogOut,
  Sun,
  Moon,
  Users,
  Camera,
  X,
  PanelLeftClose,
  PanelLeft,
  Bell,
  Cloud,
  HardDrive,
  MessageSquare,
  Shield,
  UserPlus,
  HelpCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { storage, auth } from "../firebase/firebaseClient";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "@/app/dashboard/SidebarContext";
import { useTheme } from "next-themes";
import Link from "next/link";
import Tooltip from "./Tooltip";

export default function Sidebar() {
  const { open, closeSidebar, collapsed, toggleCollapsed } = useSidebar();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("/gander.jpg");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTheme = mounted ? theme : "light";

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setEmail(user.email);
        setDisplayName(user.displayName || "User");
        if (user.photoURL) {
          setProfileImage(user.photoURL);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const imageRef = ref(storage, `profile-images/${userId}.jpg`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      setProfileImage(downloadURL);
    } catch (error) {
      console.error("Profile image upload failed:", error);
    } finally {
      setLoading(false);
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

  // Grouped Navigation - organized and professional
  const navGroups = [
    {
      group: "Workspace",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare },
        { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
        {
          label: "Notifications",
          href: "/dashboard/notifications",
          icon: Bell,
        },
      ],
    },
    {
      group: "Team & Access",
      items: [
        { label: "My Team", href: "/dashboard/teams", icon: Users },
        { label: "Team Edit", href: "/dashboard/teams/edit", icon: Users },
        { label: "Invite a Friend", href: "/dashboard/invite", icon: UserPlus },
      ],
    },
    {
      group: "Resources",
      items: [
        { label: "Saved to Cloud", href: "/dashboard/cloud", icon: Cloud },
        {
          label: "Storage & Data",
          href: "/dashboard/storage",
          icon: HardDrive,
        },
      ],
    },
    {
      group: "Account",
      items: [
        {
          label: "Help & Feedback",
          href: "/dashboard/feedback",
          icon: MessageSquare,
        },
        { label: "Privacy", href: "/dashboard/privacy", icon: Shield },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];

  const NavContent = () => (
    <>
      {/* Brand Header */}
      <div
        className={`flex items-center justify-between border-b border-gray-100 dark:border-gray-800 ${collapsed ? "px-3 py-4" : "px-5 py-4"}`}
      >
        <div
          className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${collapsed ? "justify-center w-full" : ""}`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-extrabold text-[15px] bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 whitespace-nowrap">
                TaskMate
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                Productivity Suite
              </span>
            </div>
          )}
        </div>

        {/* Close / Collapse Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={closeSidebar}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            title="Close"
          >
            <X size={17} />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>

      {/* Profile Section - Slimmed Down */}
      <div
        className={`border-b border-gray-100 dark:border-gray-800 ${collapsed ? "px-2.5 py-3" : "px-5 py-3.5"}`}
      >
        <div
          className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
        >
          <div
            className={`relative group cursor-pointer flex-shrink-0 ${collapsed ? "" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`relative rounded-full overflow-hidden border-2 border-purple-500/30 ring-2 ring-purple-500/10 ${collapsed ? "w-10 h-10" : "w-10 h-10"}`}
            >
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {loading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white w-4 h-4" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <Link href="/dashboard/settings" className="block group">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {displayName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {email}
                </p>
              </Link>
            </div>
          )}

          {!collapsed && (
            <Link
              href="/dashboard/settings"
              className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Profile Settings"
            >
              <ChevronRight size={15} />
            </Link>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>

      {/* Navigation Groups */}
      <nav
        className={`flex-1 overflow-y-auto scroll-smooth ${collapsed ? "px-2 py-3 space-y-5" : "px-3 py-4 space-y-6"}`}
        style={{ scrollbarWidth: "thin" }}
      >
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 mb-1.5">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] whitespace-nowrap">
                  {group.group}
                </h4>
              </div>
            ) : (
              <Tooltip label={group.group} position="right">
                <div className="flex justify-center mb-1">
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                </div>
              </Tooltip>
            )}

            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              const buttonContent = (
                <div
                  className={`relative flex items-center transition-all duration-200 group ${
                    collapsed
                      ? "justify-center h-10 w-10 mx-auto rounded-xl"
                      : "gap-3 px-3 py-2.5 rounded-xl"
                  } ${
                    isActive
                      ? collapsed
                        ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                        : "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/25 dark:to-indigo-900/25 text-purple-700 dark:text-purple-300 font-semibold"
                      : collapsed
                        ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {/* Active left accent bar */}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-purple-500 to-indigo-500" />
                  )}

                  <Icon
                    size={collapsed ? 19 : 18}
                    className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? collapsed
                          ? "text-white"
                          : "text-purple-600 dark:text-purple-400"
                        : collapsed
                          ? ""
                          : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                    }`}
                  />

                  {!collapsed && (
                    <span className="text-[13px] flex-1 min-w-0 truncate whitespace-nowrap">
                      {item.label}
                    </span>
                  )}

                  {isActive && !collapsed && (
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 shadow-[0_0_0_3px_rgba(168,85,247,0.2)]" />
                  )}
                </div>
              );

              return (
                <div key={item.href} className="mb-0.5">
                  {collapsed ? (
                    <Tooltip label={item.label} position="right">
                      <Link
                        href={item.href}
                        onClick={() => closeSidebar()}
                        className="block"
                      >
                        {buttonContent}
                      </Link>
                    </Tooltip>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => closeSidebar()}
                      className="block"
                    >
                      {buttonContent}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Actions - Slim */}
      <div
        className={`border-t border-gray-100 dark:border-gray-800 ${collapsed ? "px-2 py-3 space-y-1.5" : "px-3 py-3 space-y-1"}`}
      >
        {/* Theme Toggle (uses resolvedTheme to prevent SSR hydration mismatch) */}
        {collapsed ? (
          <Tooltip
            label={resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
            position="right"
          >
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {resolvedTheme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-indigo-900/20 group-hover:scale-105 transition-transform">
              {resolvedTheme === "dark" ? (
                <Sun size={17} className="text-amber-500" />
              ) : (
                <Moon size={17} className="text-indigo-500" />
              )}
            </div>
            <span className="text-[13px] font-medium flex-1 text-left">
              {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${resolvedTheme === "dark" ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${resolvedTheme === "dark" ? "translate-x-4" : ""}`}
              />
            </div>
          </button>
        )}

        {/* Help & Logout */}
        <div className={collapsed ? "space-y-1.5" : "space-y-1"}>
          {collapsed ? (
            <Tooltip label="Help Center" position="right">
              <Link
                href="/dashboard/feedback"
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <HelpCircle size={18} />
              </Link>
            </Tooltip>
          ) : (
            <Link
              href="/dashboard/feedback"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 group-hover:scale-105 transition-transform">
                <HelpCircle size={17} className="text-blue-500" />
              </div>
              <span className="text-[13px] font-medium">Help Center</span>
            </Link>
          )}

          {collapsed ? (
            <Tooltip label="Log Out" position="right">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 group-hover:scale-105 transition-transform">
                <LogOut size={17} className="text-red-500" />
              </div>
              <span className="text-[13px] font-semibold">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 backdrop-blur-sm ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar Container - REDUCED WIDTH + Collapsible */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50
          ${
            collapsed
              ? "w-[84px]" /* Slim collapsed: ~84px icon-only bar */
              : "w-[248px]" /* Slimmer expanded: down from 288px (72) */
          }
          bg-white dark:bg-gray-900
          border-r border-gray-100 dark:border-gray-800
          shadow-[2px_0_20px_-8px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_30px_-8px_rgba(0,0,0,0.4)]
          transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <NavContent />
      </aside>
    </>
  );
}
