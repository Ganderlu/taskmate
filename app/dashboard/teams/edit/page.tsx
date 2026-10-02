"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Shield,
  Loader2,
  Check,
  X,
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Crown,
  UserCog,
  Filter,
  Clock,
  CircleDot,
  CheckCircle2,
  UserPlus,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { auth, db } from "../../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  getDocs,
} from "firebase/firestore";

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  color?: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "active" | "accepted";
  canEdit?: boolean;
  userId?: string;
}

type FilterStatus = "all" | "active" | "pending";

const TEAM_COLORS = [
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-fuchsia-500",
];

const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; icon: any }
> = {
  owner: {
    bg: "bg-amber-50 dark:bg-amber-900/25",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: Crown,
  },
  admin: {
    bg: "bg-blue-50 dark:bg-blue-900/25",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: ShieldAlert,
  },
  member: {
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
    dot: "bg-gray-500",
    icon: Users,
  },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; icon: any; label: string }
> = {
  active: {
    bg: "bg-green-50 dark:bg-green-900/25",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    icon: CheckCircle2,
    label: "Active",
  },
  accepted: {
    bg: "bg-green-50 dark:bg-green-900/25",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    icon: CheckCircle2,
    label: "Active",
  },
  pending: {
    bg: "bg-yellow-50 dark:bg-yellow-900/25",
    text: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    icon: Clock,
    label: "Pending",
  },
};

export default function TeamEditPermissionsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.uid);

      // Only fetch teams owned by the user for permission management
      const q = query(
        collection(db, "teams"),
        where("ownerId", "==", user.uid),
      );

      const unsubscribeTeams = onSnapshot(q, (snapshot) => {
        const teamList: Team[] = snapshot.docs.map(
          (d, i) =>
            ({
              id: d.id,
              ...d.data(),
              color: d.data().color || TEAM_COLORS[i % TEAM_COLORS.length],
            }) as Team,
        );

        setTeams(teamList);

        if (teamList.length > 0 && !selectedTeam) {
          setSelectedTeam(teamList[0]);
        }
        setLoading(false);
      });

      return () => unsubscribeTeams();
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!selectedTeam) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    const q = query(
      collection(db, "team_members"),
      where("teamId", "==", selectedTeam.id),
    );

    const unsubscribeMembers = onSnapshot(q, (snapshot) => {
      const memberList: TeamMember[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TeamMember,
      );
      setMembers(memberList);
      setLoadingMembers(false);
    });

    return () => unsubscribeMembers();
  }, [selectedTeam]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeMenuId]);

  const togglePermission = async (member: TeamMember) => {
    try {
      const memberRef = doc(db, "team_members", member.id);
      await updateDoc(memberRef, { canEdit: !member.canEdit });
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Failed to update permission");
    }
  };

  const changeMemberRole = async (
    member: TeamMember,
    newRole: "admin" | "member",
  ) => {
    if (member.role === "owner") return;
    try {
      const memberRef = doc(db, "team_members", member.id);
      await updateDoc(memberRef, { role: newRole });
      setActiveMenuId(null);
    } catch (error) {
      console.error("Error changing role:", error);
      alert("Failed to change role");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this member from the team?")) return;
    try {
      await deleteDoc(doc(db, "team_members", memberId));
      setActiveMenuId(null);
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  const resendInvite = async (member: TeamMember) => {
    alert(`Invite reminder sent to: ${member.email}`);
    setActiveMenuId(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !inviteEmail.trim() || !currentUserId) return;

    setInviting(true);
    try {
      // Check if already exists
      const qCheck = query(
        collection(db, "team_members"),
        where("teamId", "==", selectedTeam.id),
        where("email", "==", inviteEmail.toLowerCase()),
      );
      const snap = await getDocs(qCheck);
      if (!snap.empty) {
        alert("This email is already invited or a member of this team.");
        setInviting(false);
        return;
      }

      await addDoc(collection(db, "team_members"), {
        teamId: selectedTeam.id,
        ownerId: currentUserId,
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        status: "pending",
        canEdit: inviteRole === "admin",
        createdAt: new Date().toISOString(),
      });

      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      console.error("Invite error:", error);
      alert("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  // Separated members
  const ownerMember = members.find((m) => m.role === "owner");
  const nonOwnerMembers = members.filter((m) => m.role !== "owner");

  const filteredMembers = useMemo(() => {
    let list = nonOwnerMembers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.email.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        list = list.filter(
          (m) => m.status === "active" || m.status === "accepted",
        );
      } else if (statusFilter === "pending") {
        list = list.filter((m) => m.status === "pending");
      }
    }
    return list;
  }, [nonOwnerMembers, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(
      (m) => m.status === "active" || m.status === "accepted",
    ).length;
    const pending = members.filter((m) => m.status === "pending").length;
    const admins = members.filter(
      (m) => m.role === "admin" || m.role === "owner",
    ).length;
    const editors = members.filter((m) => m.canEdit).length;
    return { total, active, pending, admins, editors };
  }, [members]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-sm font-medium text-gray-500">
          Loading team permissions...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-violet-500" />
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Access Control
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Team Permissions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage edit access, roles, and membership for your teams.
          </p>
        </div>
        {selectedTeam && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all text-sm"
          >
            <UserPlus size={17} />
            Invite Member
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {teams.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard
            label="Total Members"
            value={stats.total}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            label="Active Users"
            value={stats.active}
            icon={CheckCircle2}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            label="Pending Invites"
            value={stats.pending}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
          />
          <StatCard
            label="Admins"
            value={stats.admins}
            icon={Crown}
            gradient="from-violet-500 to-fuchsia-500"
          />
          <StatCard
            label="With Edit Access"
            value={stats.editors}
            icon={Unlock}
            gradient="from-indigo-500 to-blue-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Team Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Users size={16} className="text-violet-500" />
              Your Teams
            </h2>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
              {teams.length}
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <Shield size={26} className="text-violet-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                No teams to manage
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You don&apos;t own any teams yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team, idx) => {
                const isActive = selectedTeam?.id === team.id;
                const color =
                  team.color || TEAM_COLORS[idx % TEAM_COLORS.length];
                const tMembers = members.filter((m) => true).length || 0;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-300 dark:border-violet-700/50 ring-4 ring-violet-500/10 shadow-md shadow-violet-500/10"
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-900/50 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md flex-shrink-0 text-white`}
                      >
                        <Users size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                            {team.name}
                          </h3>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {team.description?.slice(0, 30) || "Team workspace"}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            <Users size={10} />
                            {team.id === selectedTeam?.id
                              ? members.length
                              : "..."}{" "}
                            members
                          </span>
                          <ChevronRight
                            size={14}
                            className={`transition-all ${
                              isActive
                                ? "text-violet-500 translate-x-0.5"
                                : "text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 group-hover:text-violet-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Permissions Table */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTeam ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Table Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                        <UserCog size={17} />
                      </span>
                      {selectedTeam.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-1 pl-[3.5rem">
                      {selectedTeam.description ||
                        "Control who can edit tasks and projects."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="relative">
                      <Filter
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as FilterStatus)
                        }
                        className="pl-8 pr-8 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none appearance-none cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="pending">Pending Only</option>
                      </select>
                    </div>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={15}
                      />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all w-full sm:w-64"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Banner */}
              {ownerMember && (
                <div className="mx-6 mt-6 mb-2 flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-900/50">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-amber-500/30">
                      {ownerMember.email[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                      <Crown size={11} className="text-amber-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 dark:text-white truncate">
                        {ownerMember.email}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                        <Crown size={10} /> Owner
                      </span>
                    </div>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-medium">
                      Full access · Cannot be modified · All permissions granted
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-xs font-bold whitespace-nowrap">
                    <Unlock size={12} /> Edit: Allowed
                  </div>
                </div>
              )}

              {/* Members Body */}
              <div className="p-6 pt-2">
                {loadingMembers ? (
                  <div className="py-16 text-center">
                    <Loader2 className="animate-spin mx-auto text-violet-500 w-9 h-9" />
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      Loading members...
                    </p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                      <Users
                        size={30}
                        className="text-gray-300 dark:text-gray-600"
                      />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                      {nonOwnerMembers.length === 0
                        ? "Only the owner on this team"
                        : "No members match your filters"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm mx-auto">
                      {nonOwnerMembers.length === 0
                        ? "Invite teammates to start collaborating and granting edit access."
                        : "Try adjusting your search or status filter."}
                    </p>
                    {nonOwnerMembers.length === 0 && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:-translate-y-0.5 transition-all"
                      >
                        <UserPlus size={16} /> Invite First Member
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-left min-w-[650px]">
                      <thead>
                        <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-t border-b border-gray-100 dark:border-gray-800">
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-center">Edit Access</th>
                          <th className="px-4 py-3 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800/70">
                        {filteredMembers.map((member) => {
                          const rStyle =
                            ROLE_STYLES[member.role] || ROLE_STYLES.member;
                          const sStyle =
                            STATUS_STYLES[member.status] ||
                            STATUS_STYLES.pending;
                          const StatusIcon = sStyle.icon;
                          const isPending = member.status === "pending";
                          const RoleIcon = rStyle.icon;

                          return (
                            <tr
                              key={member.id}
                              className="group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                                    {member.email[0]?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${rStyle.bg} ${rStyle.text} border-transparent`}
                                >
                                  <RoleIcon size={11} />
                                  <span className="capitalize">
                                    {member.role}
                                  </span>
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${sStyle.bg} ${sStyle.text}`}
                                >
                                  <StatusIcon
                                    size={11}
                                    className={isPending ? "animate-pulse" : ""}
                                  />
                                  {sStyle.label}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => togglePermission(member)}
                                  disabled={isPending}
                                  title={
                                    isPending
                                      ? "Wait for member to accept invite"
                                      : "Toggle edit permission"
                                  }
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-violet-500/30 ${
                                    member.canEdit
                                      ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-md shadow-violet-500/30"
                                      : "bg-gray-200 dark:bg-gray-700"
                                  } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-6 w-6 transform rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center ${
                                      member.canEdit
                                        ? "left-[22px]"
                                        : "left-0.5"
                                    }`}
                                  >
                                    {member.canEdit ? (
                                      <Unlock
                                        size={11}
                                        className="text-violet-600"
                                      />
                                    ) : (
                                      <Lock
                                        size={11}
                                        className="text-gray-400"
                                      />
                                    )}
                                  </span>
                                </button>
                                <p className="mt-1.5 text-[10px] font-bold text-gray-400">
                                  {member.canEdit ? "Allowed" : "Restricted"}
                                </p>
                              </td>
                              <td className="px-4 py-3.5 text-right relative">
                                <div className="task-menu-container inline-block">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(
                                        activeMenuId === member.id
                                          ? null
                                          : member.id,
                                      );
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <MoreVertical size={17} />
                                  </button>

                                  {activeMenuId === member.id && (
                                    <div className="absolute right-4 top-10 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                      <div className="p-1.5">
                                        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                          Change Role
                                        </p>
                                        <button
                                          onClick={() =>
                                            changeMemberRole(member, "admin")
                                          }
                                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                                            member.role === "admin"
                                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold"
                                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                          }`}
                                        >
                                          <ShieldAlert
                                            size={15}
                                            className="text-blue-500"
                                          />
                                          Make Admin
                                          {member.role === "admin" && (
                                            <Check
                                              size={13}
                                              className="ml-auto"
                                            />
                                          )}
                                        </button>
                                        <button
                                          onClick={() =>
                                            changeMemberRole(member, "member")
                                          }
                                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                                            member.role === "member"
                                              ? "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold"
                                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                          }`}
                                        >
                                          <Users
                                            size={15}
                                            className="text-gray-500"
                                          />
                                          Make Member
                                          {member.role === "member" && (
                                            <Check
                                              size={13}
                                              className="ml-auto"
                                            />
                                          )}
                                        </button>
                                        {isPending && (
                                          <>
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />
                                            <button
                                              onClick={() =>
                                                resendInvite(member)
                                              }
                                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                              <Mail size={15} />
                                              Resend Invite
                                            </button>
                                          </>
                                        )}
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />
                                        <button
                                          onClick={() =>
                                            removeMember(member.id)
                                          }
                                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                                        >
                                          <Trash2 size={15} />
                                          Remove from Team
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center min-h-[400px]">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-5">
                <Lock size={36} className="text-violet-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
                Select a Team
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 text-sm">
                Choose a team from the list to manage editing permissions for
                its members.
              </p>
              <Link
                href="/dashboard/teams"
                className="text-violet-600 dark:text-violet-400 text-sm font-bold hover:underline"
              >
                Go to Teams →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Invite Team Member
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  for{" "}
                  <span className="font-bold text-violet-600 dark:text-violet-400">
                    {selectedTeam?.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-5">
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
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm font-medium"
                    placeholder="colleague@company.com"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        value: "member",
                        label: "Member",
                        desc: "View only by default",
                        icon: Users,
                        color: "gray",
                      },
                      {
                        value: "admin",
                        label: "Admin",
                        desc: "Edit + invite",
                        icon: ShieldAlert,
                        color: "blue",
                      },
                    ] as const
                  ).map((opt) => {
                    const isActive = inviteRole === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setInviteRole(opt.value)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          isActive
                            ? opt.color === "blue"
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-700/50 ring-4 ring-blue-500/10"
                              : "bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-700/50 ring-4 ring-violet-500/10"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <opt.icon
                            size={17}
                            className={
                              isActive
                                ? opt.color === "blue"
                                  ? "text-blue-500"
                                  : "text-violet-500"
                                : "text-gray-400"
                            }
                          />
                          <span
                            className={`text-sm font-extrabold ${
                              isActive
                                ? opt.color === "blue"
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-violet-700 dark:text-violet-400"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {opt.desc}
                        </p>
                        {isActive && (
                          <div className="absolute top-2.5 right-2.5">
                            <Check
                              size={15}
                              className={
                                opt.color === "blue"
                                  ? "text-blue-500"
                                  : "text-violet-500"
                              }
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-5 py-3 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/25 disabled:opacity-60 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all text-sm"
                >
                  {inviting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-2.5">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
        >
          <Icon size={17} className="text-white" />
        </div>
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
