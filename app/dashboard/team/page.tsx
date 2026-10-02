"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Check,
  X,
  Loader2,
  Search,
  Briefcase,
  ArrowRight,
  Plus,
  ArrowLeft,
  Crown,
  MoreHorizontal,
  CalendarDays,
  TrendingUp,
  Filter,
  FolderKanban,
  ChevronRight,
  Clock,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: any;
  memberCount?: number;
  color?: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "active" | "accepted";
  addedAt?: string;
  joinedAt?: string;
  teamId?: string;
  userId?: string;
  canEdit?: boolean;
}

const TEAM_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
];

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

const ROLE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  owner: { bg: "bg-amber-50 dark:bg-amber-900/25", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  admin: { bg: "bg-blue-50 dark:bg-blue-900/25", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  member: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", dot: "bg-gray-500" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-green-50 dark:bg-green-900/25", text: "text-green-700 dark:text-green-400", dot: "bg-green-500", label: "Active" },
  accepted: { bg: "bg-green-50 dark:bg-green-900/25", text: "text-green-700 dark:text-green-400", dot: "bg-green-500", label: "Active" },
  pending: { bg: "bg-yellow-50 dark:bg-yellow-900/25", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500", label: "Pending" },
};

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "manage">("list");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create Team State
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Active menus
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => { setActiveMemberMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchUserTeams(user.uid, user.email || "");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all teams owned + teams user is a member of
  const fetchUserTeams = async (userId: string, userEmail: string) => {
    setLoading(true);
    try {
      // 1. Owned teams
      const ownedQ = query(collection(db, "teams"), where("ownerId", "==", userId));
      const ownedSnap = await getDocs(ownedQ);

      const ownedTeamsList = await Promise.all(
        ownedSnap.docs.map(async (d) => {
          const teamData = d.data();
          const teamId = d.id;
          const membersQ = query(collection(db, "team_members"), where("teamId", "==", teamId));
          let memberCount = 0;
          try {
            const c = await getDocs(membersQ);
            memberCount = c.size;
          } catch { /* ignore */ }
          return { id: teamId, ...teamData, memberCount } as Team;
        })
      );

      // 2. Teams where user is accepted/active member but not owner
      const memberQ = query(
        collection(db, "team_members"),
        where("email", "==", userEmail),
      );
      const memberSnap = await getDocs(memberQ);
      const joinedTeamIds = Array.from(
        new Set(
          memberSnap.docs
            .filter(d => {
              const data = d.data();
              return (data.status === "accepted" || data.status === "active") && data.role !== "owner";
            })
            .map(d => d.data().teamId)
        )
      ).filter(Boolean) as string[];

      const joinedTeamsList: Team[] = [];
      for (const tid of joinedTeamIds) {
        try {
          const tDoc = await getDoc(doc(db, "teams", tid));
          if (tDoc.exists()) {
            try {
              const membersQ = query(collection(db, "team_members"), where("teamId", "==", tid));
              const c = await getDocs(membersQ);
              joinedTeamsList.push({ id: tid, memberCount: c.size, ...tDoc.data() } as Team);
            } catch {
              joinedTeamsList.push({ id: tid, memberCount: 0, ...tDoc.data() } as Team);
            }
          }
        } catch { /* ignore */ }
      }

      // Deduplicate
      const map = new Map<string, Team>();
      [...ownedTeamsList, ...joinedTeamsList].forEach(t => {
        if (!map.has(t.id)) {
          map.set(t.id, { ...t, color: t.color || TEAM_COLORS[map.size % TEAM_COLORS.length] });
        }
      });

      const combined = Array.from(map.values());
      setTeams(combined);

      if (combined.length === 0) {
        setView("create");
      } else {
        setView("list");
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch teams when returning to list
  useEffect(() => {
    if (view === "list" && auth.currentUser) {
      fetchUserTeams(auth.currentUser.uid, auth.currentUser.email || "");
    }
  }, [view]);

  // Real-time listener for team members
  useEffect(() => {
    if (!selectedTeam) return;

    const q = query(
      collection(db, "team_members"),
      where("teamId", "==", selectedTeam.id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TeamMember)
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
      setMembers(list);
    });

    return () => unsubscribe();
  }, [selectedTeam]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !auth.currentUser) return;

    setCreatingTeam(true);
    try {
      const color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      const newTeam = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        ownerId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        memberCount: 1,
        color,
      };

      const docRef = await addDoc(collection(db, "teams"), newTeam);
      const teamWithId: Team = { id: docRef.id, ...newTeam };

      // Add owner as active member with owner role
      const ownerMember = {
        ownerId: auth.currentUser.uid,
        userId: auth.currentUser.uid,
        teamId: docRef.id,
        email: auth.currentUser.email || "",
        role: "owner" as const,
        status: "active" as const,
        canEdit: true,
        joinedAt: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "team_members"), ownerMember);

      setTeams(prev => [...prev, teamWithId]);
      setSelectedTeam(teamWithId);
      setView("manage");

      setTeamName("");
      setTeamDescription("");
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team. Please try again.");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !auth.currentUser || !selectedTeam) return;

    setSending(true);
    try {
      const exists = members.some(
        (m) => m.email.toLowerCase() === inviteEmail.trim().toLowerCase()
      );
      if (exists) {
        alert("This user is already invited or a member of this team.");
        setSending(false);
        return;
      }

      const newMember = {
        ownerId: auth.currentUser.uid,
        teamId: selectedTeam.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "pending" as const,
        addedAt: new Date().toISOString(),
        canEdit: inviteRole === "admin",
      };

      const memberDocRef = await addDoc(collection(db, "team_members"), newMember);

      setMembers(prev =>
        [...prev, { ...newMember, id: memberDocRef.id } as TeamMember]
          .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
      );
      setInviteEmail("");
      setIsInviteOpen(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      alert("Failed to send invitation.");
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await deleteDoc(doc(db, "team_members", id));
      setMembers(prev => prev.filter((m) => m.id !== id));
      setActiveMemberMenu(null);
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member.");
    }
  };

  const changeMemberRole = async (id: string, newRole: "admin" | "member") => {
    try {
      await updateDoc(doc(db, "team_members", id), {
        role: newRole,
        canEdit: newRole === "admin" ? true : undefined,
      });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole, canEdit: newRole === "admin" ? true : m.canEdit } : m));
      setActiveMemberMenu(null);
    } catch {
      alert("Failed to update role");
    }
  };

  /* Derived */
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const activeCount = members.filter(m => m.status === "active" || m.status === "accepted").length;
    const pendingCount = members.filter(m => m.status === "pending").length;
    const adminCount = members.filter(m => m.role === "admin" || m.role === "owner").length;
    return { totalMembers, activeCount, pendingCount, adminCount };
  }, [members]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => m.email.toLowerCase().includes(q));
  }, [members, memberSearch]);

  const isOwnerOfSelected = selectedTeam?.ownerId === currentUserId;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
          <div className="absolute inset-0 blur-xl bg-violet-500/20 rounded-full -z-10" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your teams...</p>
      </div>
    );
  }

  // VIEW: CREATE TEAM
  if (view === "create") {
    return (
      <div className="max-w-xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8">
          {teams.length > 0 && (
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-6 font-semibold"
            >
              <ArrowLeft size={18} />
              <span>Back to Teams</span>
            </button>
          )}
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
              {teams.length === 0
                ? "Set Up Your First Team"
                : "Create New Team"}
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              Create a workspace to collaborate with your team members.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-7 shadow-xl border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleCreateTeam} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Acme Corp, Design Team"
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Description <span className="text-gray-400 font-normal normal-case">(Optional)</span>
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="What is this team working on?"
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base text-gray-900 dark:text-white placeholder-gray-400 min-h-[110px] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creatingTeam || !teamName.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-extrabold shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 hover:translate-y-[-1.5px] transition-all disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              {creatingTeam ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Team</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // VIEW: TEAM LIST (My Teams)
  if (view === "list") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-5 h-5 text-violet-500" />
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                Team Workspace
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              My Teams
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Select a team to manage or create a new one.
            </p>
          </div>
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus size={17} />
            New Team
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Teams" value={teams.length} icon={Briefcase} gradient="from-violet-500 to-purple-500" />
          <StatCard
            label="Teams I Own"
            value={teams.filter(t => t.ownerId === currentUserId).length}
            icon={Crown}
            gradient="from-amber-500 to-orange-500"
          />
          <StatCard
            label="Total Members"
            value={teams.reduce((s, t) => s + (t.memberCount || 0), 0)}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard label="Avg / Team" value={teams.length ? Math.round(teams.reduce((s, t) => s + (t.memberCount || 0), 0) / teams.length) : 0} icon={TrendingUp} gradient="from-pink-500 to-rose-500" />
        </div>

        {/* Search */}
        <div className="flex items-stretch gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams by name or description..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all"
            />
          </div>
          <div className="flex items-center px-3 text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredTeams.length} / {teams.length}
          </div>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-6">
              <Briefcase size={38} className="text-violet-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No teams match your search" : "No teams yet"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-7 text-sm">
              {searchQuery ? "Try adjusting your search." : "Create your first team."}
            </p>
            <button
              onClick={() => { setSearchQuery(""); setView("create"); }}
              className="flex items-center gap-2 mx-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all"
            >
              <Plus size={17} />
              Create New Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeams.map((t) => {
              const color = t.color || "from-violet-500 to-indigo-500";
              const isOwner = t.ownerId === currentUserId;
              const created = t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt ? new Date(t.createdAt) : null;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTeam(t);
                    setView("manage");
                  }}
                  className="group relative bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 cursor-pointer transition-all overflow-hidden"
                >
                  <div className={`h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r ${color}`} />

                  <div className="flex items-start justify-between mb-4 pt-1">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Briefcase size={21} className="text-white" />
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${isOwner
                        ? "bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400"
                        : "bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400"
                    }`}>
                      {isOwner ? <Crown size={10} /> : <Users size={10} />}
                      {isOwner ? "Owner" : "Member"}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1 truncate">
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-8 leading-relaxed">
                    {t.description || "No description yet."}
                  </p>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                    {created && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        <CalendarDays size={11} />
                        {dayjs(created).format("MMM D, YYYY")}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full text-xs font-bold group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-colors">
                      <Users size={12} />
                      {t.memberCount || 0}
                      <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create Card */}
            <button
              onClick={() => setView("create")}
              className="group flex flex-col items-center justify-center p-5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-all min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-violet-500 transition-colors" />
              </div>
              <span className="font-bold text-gray-600 dark:text-gray-300 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                Create Another Team
              </span>
              <span className="text-xs text-gray-400 mt-1">Set up a new workspace</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // VIEW: MANAGE TEAM (Dashboard)
  if (!selectedTeam) return null;

  const teamColor = selectedTeam.color || "from-violet-500 to-indigo-500";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-5">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors w-fit font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Back to all teams</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${teamColor} flex items-center justify-center shadow-xl flex-shrink-0`}>
              <Briefcase size={28} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {isOwnerOfSelected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400">
                    <Crown size={11} /> Owner
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {selectedTeam.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                {selectedTeam.description || "Manage your team members and permissions."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/teams/edit"
              className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold text-sm"
            >
              <Shield size={15} />
              <span className="hidden sm:inline">Permissions</span>
              <span className="sm:hidden">Access</span>
            </Link>
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold text-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Team</span>
            </button>
            {isOwnerOfSelected && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all font-bold text-sm"
              >
                <UserPlus size={17} />
                <span>Invite Member</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ManageStat label="Total Members" value={stats.totalMembers} icon={Users} gradient="from-violet-500 to-purple-500" />
        <ManageStat label="Active" value={stats.activeCount} icon={CheckCircle2} gradient="from-green-500 to-emerald-500" />
        <ManageStat label="Pending" value={stats.pendingCount} icon={Clock} gradient="from-amber-500 to-orange-500" />
        <ManageStat label="Owners/Admins" value={stats.adminCount} icon={Crown} gradient="from-blue-500 to-cyan-500" />
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6 relative border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-6 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg">
                <UserPlus size={22} className="text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Invite to {selectedTeam.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Send an invitation to join this team.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                    placeholder="colleague@example.com"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(["member", "admin"] as const).map((role) => {
                    const Icon = role === "admin" ? Shield : Users;
                    const active = inviteRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold capitalize border-2 transition-all flex items-center justify-center gap-2 ${
                          active
                            ? "bg-violet-50 border-violet-400 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-400"
                            : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <Icon size={15} />
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Check size={16} />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Members */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members by email..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-6">
              <Users className="w-9 h-9 text-violet-500" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
              {memberSearch ? "No members match your search" : "Your team is empty"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 text-sm">
              {memberSearch ? "Try different search terms." : "Start building your dream team."}
            </p>
            {isOwnerOfSelected && (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {memberSearch && (
                  <button
                    onClick={() => setMemberSearch("")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X size={15} /> Clear
                  </button>
                )}
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all"
                >
                  <UserPlus size={16} />
                  Invite first member
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Date Added
                  </th>
                  {isOwnerOfSelected && (
                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-20">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/70">
                {filteredMembers.map((member) => {
                  const rStyle = ROLE_STYLES[member.role] || ROLE_STYLES.member;
                  const sStyle = STATUS_STYLES[member.status] || STATUS_STYLES.pending;
                  const date = member.joinedAt || member.addedAt;
                  const isOwner = member.role === "owner";

                  return (
                    <tr
                      key={member.id}
                      className="group hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${rStyle.bg} flex items-center justify-center ${rStyle.text} font-extrabold shadow-sm border border-white dark:border-gray-900`}>
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {member.email}
                            </div>
                            {member.canEdit && member.status !== "pending" && (
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">
                                Edit Access
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${rStyle.bg} ${rStyle.text} border-transparent`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rStyle.dot}`} />
                          <span className="capitalize">{member.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${sStyle.bg} ${sStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`} />
                          {sStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {date ? dayjs(new Date(date)).format("MMM D, YYYY") : "—"}
                      </td>
                      {isOwnerOfSelected && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isOwner ? (
                            <Crown size={18} className="text-amber-500 inline-block" />
                          ) : (
                            <div className="relative task-menu-container inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMemberMenu(activeMemberMenu === member.id ? null : member.id);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Member actions"
                              >
                                <MoreHorizontal size={17} />
                              </button>
                              {activeMemberMenu === member.id && (
                                <div className="absolute right-6 top-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                  <div className="p-1">
                                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Change Role</p>
                                    <button onClick={() => changeMemberRole(member.id, "admin")} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${member.role === "admin" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                                      <Shield size={14} /> Make Admin
                                    </button>
                                    <button onClick={() => changeMemberRole(member.id, "member")} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${member.role === "member" ? "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                                      <Users size={14} /> Make Member
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                    <button onClick={() => removeMember(member.id)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold">
                                      <Trash2 size={14} /> Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Subcomponents ========== */

function StatCard({
  label, value, icon: Icon, gradient,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
}) {
  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={19} className="text-white" />
        </div>
        <TrendingUp size={14} className="text-green-500 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {value}
      </div>
      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ManageStat({
  label, value, icon: Icon, gradient,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
}) {
  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-2.5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {value}
      </div>
      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}
