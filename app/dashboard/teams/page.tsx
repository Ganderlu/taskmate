"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Mail,
  Shield,
  MoreHorizontal,
  Loader2,
  UserPlus,
  Crown,
  X,
  Check,
  Trash2,
  Edit3,
  Briefcase,
  TrendingUp,
  CalendarDays,
  Search,
  Filter,
  Grid3x3,
  ListTodo,
  LayoutGrid,
  ChevronRight,
  Settings,
  BarChart3,
  Send,
  FolderKanban,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { auth, db } from "../../firebase/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import Link from "next/link";
import dayjs from "dayjs";

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: any;
  memberCount: number;
  color?: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "active" | "accepted";
  joinedAt?: string;
  canEdit?: boolean;
  teamId: string;
  ownerId?: string;
  userId?: string;
}

type ViewMode = "grid" | "list";

const TEAM_COLORS = [
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-red-500",
  "from-teal-500 to-cyan-500",
];

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

const ROLE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  owner: {
    bg: "bg-amber-50 dark:bg-amber-900/25",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  admin: {
    bg: "bg-blue-50 dark:bg-blue-900/25",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  member: {
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
    dot: "bg-gray-500",
  },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  active: {
    bg: "bg-green-50 dark:bg-green-900/25",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    label: "Active",
  },
  accepted: {
    bg: "bg-green-50 dark:bg-green-900/25",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    label: "Active",
  },
  pending: {
    bg: "bg-yellow-50 dark:bg-yellow-900/25",
    text: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    label: "Pending",
  },
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [allMembers, setAllMembers] = useState<Record<string, TeamMember[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create Team Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite + Details Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [detailMembers, setDetailMembers] = useState<TeamMember[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);

  // Edit Team Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Menu state
  const [activeTeamMenu, setActiveTeamMenu] = useState<string | null>(null);

  /* ============ Data Loading ============ */
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.uid);
      setLoadError(null);

      // 1. Owned Teams listener
      const ownedTeamsQuery = query(
        collection(db, "teams"),
        where("ownerId", "==", user.uid),
      );
      let ownedTeams: Team[] = [];
      let memberTeams: Team[] = [];

      const updateTeams = () => {
        const allTeams = [...ownedTeams, ...memberTeams];
        const uniqueTeams = Array.from(
          new Map(allTeams.map((item) => [item.id, item])).values(),
        ).map((t, idx) => ({
          ...t,
          color: t.color || TEAM_COLORS[idx % TEAM_COLORS.length],
        }));

        setTeams(uniqueTeams);
        setLoading(false);
      };

      const mergeMembersFromSnapshot = (
        rows: TeamMember[],
        scope: "owned" | "own",
      ) => {
        setAllMembers((prev) => {
          const next = { ...prev };
          rows.forEach((r) => {
            if (!next[r.teamId]) next[r.teamId] = [];
            const idx = next[r.teamId].findIndex((x) => x.id === r.id);
            if (idx >= 0) next[r.teamId][idx] = r;
            else next[r.teamId].push(r);
          });
          // Sync team member counts
          setTeams((prevTeams) =>
            prevTeams.map((t) => ({
              ...t,
              memberCount: next[t.id]?.length ?? t.memberCount,
            })),
          );
          void scope;
          return next;
        });
      };

      const unsubOwned = onSnapshot(
        ownedTeamsQuery,
        async (snapshot) => {
          ownedTeams = await Promise.all(
            snapshot.docs.map(async (d) => {
              try {
                const mq = query(
                  collection(db, "team_members"),
                  where("ownerId", "==", user.uid),
                  where("teamId", "==", d.id),
                );
                const countSnap = await getDocs(mq);
                return {
                  id: d.id,
                  memberCount: countSnap.size,
                  ...d.data(),
                } as Team;
              } catch {
                return { id: d.id, memberCount: 0, ...d.data() } as Team;
              }
            }),
          );
          updateTeams();
        },
        (err) => {
          console.error("[teams] ownedTeams snapshot error:", err);
          if ((err as any)?.code === "permission-denied") {
            setLoadError(
              "Firebase rules not deployed. Please publish the latest firestore.rules in Firebase Console → Firestore → Rules.",
            );
          }
        },
      );

      // 2. Teams the user is a MEMBER of — check BOTH by email AND by userId
      const memberTeamsByEmailQ = query(
        collection(db, "team_members"),
        where("email", "==", user.email || "__no_email__"),
      );
      const memberTeamsByUidQ = query(
        collection(db, "team_members"),
        where("userId", "==", user.uid),
      );

      let memberEmailRows: any[] = [];
      let memberUidRows: any[] = [];

      const processMemberRows = (rows: any[]) => {
        const teamIds = rows
          .filter((d) => {
            const data = d.data();
            return (
              data.teamId &&
              (data.status === "accepted" || data.status === "active") &&
              data.role !== "owner"
            );
          })
          .map((d) => d.data().teamId);
        return Array.from(new Set(teamIds)).filter(Boolean) as string[];
      };

      const reloadMemberTeams = async () => {
        const uniqIds = processMemberRows([
          ...memberEmailRows,
          ...memberUidRows,
        ]);
        if (uniqIds.length === 0) {
          memberTeams = [];
          updateTeams();
          return;
        }
        const loaded: Team[] = [];
        for (const tid of uniqIds) {
          try {
            const tDoc = await getDoc(doc(db, "teams", tid));
            if (tDoc.exists()) {
              try {
                const mq = query(
                  collection(db, "team_members"),
                  where("teamId", "==", tid),
                );
                const countSnap = await getDocs(mq);
                loaded.push({
                  id: tDoc.id,
                  memberCount: countSnap.size,
                  ...tDoc.data(),
                } as Team);
              } catch {
                loaded.push({
                  id: tDoc.id,
                  memberCount: 0,
                  ...tDoc.data(),
                } as Team);
              }
            }
          } catch {
            /* ignore */
          }
        }
        memberTeams = loaded;
        updateTeams();
      };

      const unsubMemberEmail = onSnapshot(
        memberTeamsByEmailQ,
        (snap) => {
          memberEmailRows = snap.docs;
          reloadMemberTeams();
        },
        (err) => {
          console.error("[teams] memberByEmail snapshot error:", err);
          if ((err as any)?.code === "permission-denied") {
            setLoadError(
              "Firebase rules not deployed. Please publish the latest firestore.rules in Firebase Console → Firestore → Rules.",
            );
          }
        },
      );

      const unsubMemberUid = onSnapshot(
        memberTeamsByUidQ,
        (snap) => {
          memberUidRows = snap.docs;
          reloadMemberTeams();
        },
        (err) => {
          console.error("[teams] memberByUid snapshot error:", err);
          if ((err as any)?.code === "permission-denied") {
            setLoadError(
              "Firebase rules not deployed. Please publish the latest firestore.rules in Firebase Console → Firestore → Rules.",
            );
          }
        },
      );

      // 3. SCOPED members listeners (never listen to the FULL collection — rules deny that)
      //    a) Members of teams the current user OWNS (ownerId==uid)
      //    b) The current user's own membership rows (userId==uid)
      const ownedMembersQ = query(
        collection(db, "team_members"),
        where("ownerId", "==", user.uid),
      );
      const ownMembershipsQ = query(
        collection(db, "team_members"),
        where("userId", "==", user.uid),
      );

      const unsubOwnedMembers = onSnapshot(
        ownedMembersQ,
        (snap) => {
          const rows = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as TeamMember,
          );
          mergeMembersFromSnapshot(rows, "owned");
        },
        (err) => {
          console.error("[teams] ownedMembers snapshot error:", err);
          if ((err as any)?.code === "permission-denied") {
            setLoadError(
              "Firebase rules not deployed. Please publish the latest firestore.rules in Firebase Console → Firestore → Rules.",
            );
          }
        },
      );

      const unsubOwnMemberships = onSnapshot(
        ownMembershipsQ,
        (snap) => {
          const rows = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as TeamMember,
          );
          mergeMembersFromSnapshot(rows, "own");
        },
        (err) => {
          console.error("[teams] ownMemberships snapshot error:", err);
          if ((err as any)?.code === "permission-denied") {
            setLoadError(
              "Firebase rules not deployed. Please publish the latest firestore.rules in Firebase Console → Firestore → Rules.",
            );
          }
        },
      );

      return () => {
        unsubOwned();
        unsubMemberEmail();
        unsubMemberUid();
        unsubOwnedMembers();
        unsubOwnMemberships();
      };
    });
    return () => unsubscribeAuth();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => {
      setActiveTeamMenu(null);
      setActiveMemberMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ============ CRUD Handlers ============ */

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTeamName.trim()) return;

    setCreating(true);
    try {
      const color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      const teamData = {
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        ownerId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        memberCount: 1,
        color,
      };
      const docRef = await addDoc(collection(db, "teams"), teamData);

      // Add owner as active member
      await addDoc(collection(db, "team_members"), {
        teamId: docRef.id,
        ownerId: auth.currentUser.uid,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        role: "owner",
        status: "active",
        joinedAt: new Date().toISOString(),
        canEdit: true,
      });

      setNewTeamName("");
      setNewTeamDesc("");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const openTeamDetail = async (team: Team) => {
    setDetailTeam(team);
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const q = query(
        collection(db, "team_members"),
        where("teamId", "==", team.id),
      );
      const snap = await getDocs(q);
      const members = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TeamMember)
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
      setDetailMembers(members);
    } catch (err) {
      console.error("detail error", err);
      setDetailMembers([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTeam || !inviteEmail.trim() || !currentUserId) return;

    setInviting(true);
    try {
      const existing = detailMembers.find(
        (m) => m.email.toLowerCase() === inviteEmail.toLowerCase(),
      );
      if (existing) {
        alert("This user is already invited or a member of this team.");
        setInviting(false);
        return;
      }

      await addDoc(collection(db, "team_members"), {
        teamId: detailTeam.id,
        ownerId: currentUserId,
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        status: "pending",
        canEdit: inviteRole === "admin",
        createdAt: Timestamp.now(),
      });

      setInviteEmail("");
      // refresh detail members
      openTeamDetail(detailTeam);
    } catch (error) {
      console.error("Invite error", error);
      alert("Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await deleteDoc(doc(db, "team_members", memberId));
      setDetailMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActiveMemberMenu(null);
    } catch {
      alert("Failed to remove member");
    }
  };

  const changeMemberRole = async (
    memberId: string,
    newRole: "admin" | "member",
  ) => {
    try {
      await updateDoc(doc(db, "team_members", memberId), {
        role: newRole,
        canEdit: newRole === "admin" ? true : undefined,
      });
      setDetailMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );
      setActiveMemberMenu(null);
    } catch {
      alert("Failed to update role");
    }
  };

  const openEditModal = (team: Team) => {
    setEditTeam(team);
    setEditName(team.name);
    setEditDesc(team.description || "");
    setShowEditModal(true);
    setActiveTeamMenu(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam || !editName.trim()) return;

    setSavingEdit(true);
    try {
      await updateDoc(doc(db, "teams", editTeam.id), {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === editTeam.id
            ? { ...t, name: editName.trim(), description: editDesc.trim() }
            : t,
        ),
      );
      setShowEditModal(false);
      setEditTeam(null);
    } catch {
      alert("Failed to update team");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteTeam = async (team: Team) => {
    if (team.ownerId !== currentUserId) {
      alert("Only the team owner can delete this team.");
      return;
    }
    if (
      !confirm(
        `Delete team "${team.name}"? All members will be removed. This can't be undone.`,
      )
    )
      return;

    try {
      setActiveTeamMenu(null);
      // Delete all team members first, then the team
      const membersSnap = await getDocs(
        query(collection(db, "team_members"), where("teamId", "==", team.id)),
      );
      await Promise.all(membersSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "teams", team.id));
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      if (selectedTeam?.id === team.id) setSelectedTeam(null);
    } catch {
      alert("Failed to delete team");
    }
  };

  /* ============ Derived Data ============ */

  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalMembers = Object.values(allMembers).flat().length;
    const myOwnedTeams = teams.filter(
      (t) => t.ownerId === currentUserId,
    ).length;
    const pendingInvites = Object.values(allMembers)
      .flat()
      .filter((m) => m.status === "pending").length;
    return { totalTeams, totalMembers, myOwnedTeams, pendingInvites };
  }, [teams, allMembers, currentUserId]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q),
    );
  }, [teams, searchQuery]);

  const isOwnerOfSelected = detailTeam?.ownerId === currentUserId;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
          <div className="absolute inset-0 blur-xl bg-violet-500/20 rounded-full -z-10" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading your teams...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-3">
            Unable to load teams
          </h2>
          <p className="text-red-700 dark:text-red-400 mb-6 leading-relaxed">
            {loadError}
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 text-left mb-6 border border-red-100 dark:border-red-900/40">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
              Fix in 30 seconds — paste these rules in Firebase Console:
            </p>
            <pre className="text-xs bg-gray-900 dark:bg-black text-green-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-words">
              {`Firebase Console → Firestore Database → Rules tab → Paste & Publish.

Or run:
  firebase deploy --only firestore:rules
  firebase deploy --only firestore:indexes`}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
          >
            <RotateCcw size={18} />
            Retry after deploying rules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ========= HERO HEADER ========= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-violet-500" />
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            My Teams
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Collaborate, manage roles, and organize work with your teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/teams/edit"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-semibold text-sm transition-colors"
          >
            <Shield size={15} />
            <span className="hidden sm:inline">Permissions</span>
            <span className="sm:hidden">Access</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus size={17} />
            New Team
          </button>
        </div>
      </div>

      {/* ========= STATS OVERVIEW ========= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Teams"
          value={stats.totalTeams}
          icon={Briefcase}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          label="Teams I Own"
          value={stats.myOwnedTeams}
          icon={Crown}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          label="Total Members"
          value={stats.totalMembers}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          label="Pending Invites"
          value={stats.pendingInvites}
          icon={Mail}
          gradient="from-pink-500 to-rose-500"
        />
      </div>

      {/* ========= SEARCH + FILTER + VIEW TOGGLE ========= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name or description..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="List View"
            >
              <ListTodo size={16} />
            </button>
          </div>

          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap pl-1 pr-1">
            {filteredTeams.length} team{filteredTeams.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ========= TEAMS CONTENT ========= */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 md:p-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Briefcase size={38} className="text-violet-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            {searchQuery
              ? "No teams match your search"
              : teams.length === 0
                ? "Create your first team"
                : "No results"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-7 text-sm">
            {teams.length === 0
              ? "Set up a workspace to collaborate with teammates, assign roles, and manage projects together."
              : "Try adjusting your search terms or filters."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setSearchQuery("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
            >
              <Plus size={17} />
              {teams.length === 0
                ? "Create Your First Team"
                : "Create New Team"}
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={16} />
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ========= GRID VIEW ========= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            const color = team.color || "from-violet-500 to-indigo-500";
            const members = allMembers[team.id] || [];
            const owners = members.filter((m) => m.role === "owner");
            const owner = owners[0];
            const activeCount = members.filter(
              (m) => m.status === "active" || m.status === "accepted",
            ).length;
            const pendingCount = members.filter(
              (m) => m.status === "pending",
            ).length;
            const created = team.createdAt?.toDate
              ? team.createdAt.toDate()
              : team.createdAt
                ? new Date(team.createdAt)
                : null;
            const isOwner = team.ownerId === currentUserId;

            return (
              <div
                key={team.id}
                onClick={() => openTeamDetail(team)}
                className="group relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
              >
                {/* Colored band */}
                <div className={`h-2 w-full bg-gradient-to-r ${color}`} />

                <div className="p-5 space-y-4">
                  {/* Top row: Icon + menu */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Briefcase size={21} />
                    </div>

                    <div
                      className="relative task-menu-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTeamMenu(
                            activeTeamMenu === team.id ? null : team.id,
                          );
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {activeTeamMenu === team.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <div className="p-1.5">
                            <button
                              onClick={() => openTeamDetail(team)}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <Users size={15} className="text-gray-400" />
                              View Members
                            </button>
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => openEditModal(team)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <Edit3 size={15} className="text-gray-400" />
                                  Edit Team
                                </button>
                                <Link
                                  href="/dashboard/teams/edit"
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <Shield
                                    size={15}
                                    className="text-violet-500"
                                  />
                                  Manage Permissions
                                </Link>
                              </>
                            )}
                            {isOwner && (
                              <>
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                <button
                                  onClick={() => deleteTeam(team)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                                >
                                  <Trash2 size={15} />
                                  Delete Team
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team info */}
                  <div className="space-y-1.5 pr-2">
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">
                      {team.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 h-8 leading-relaxed">
                      {team.description || "No description yet."}
                    </p>
                  </div>

                  {/* Member avatars */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center -space-x-2">
                      {members.slice(0, 5).map((m) => {
                        const rStyle = ROLE_STYLES[m.role];
                        return (
                          <div
                            key={m.id}
                            className={`w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 ${rStyle.bg} flex items-center justify-center ${rStyle.text} text-[11px] font-bold shadow-sm`}
                            title={m.email}
                          >
                            {m.email.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                      {members.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          +{members.length - 5}
                        </div>
                      )}
                      {members.length === 0 && (
                        <div className="text-xs font-semibold text-gray-400 italic">
                          No members yet
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        isOwner
                          ? "bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400"
                          : "bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {isOwner ? <Crown size={10} /> : <Users size={10} />}
                      {isOwner ? "Owner" : "Member"}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                    <StatMini
                      label="Total"
                      value={members.length || team.memberCount}
                    />
                    <StatMini
                      label="Active"
                      value={activeCount}
                      color="text-green-600 dark:text-green-400"
                    />
                    <StatMini
                      label="Pending"
                      value={pendingCount}
                      color="text-amber-600 dark:text-amber-400"
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {created && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        <CalendarDays size={11} />
                        {dayjs(created).format("MMM D, YYYY")}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm font-bold text-violet-600 dark:text-violet-400 ml-auto">
                      Open
                      <ChevronRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create Team Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all p-5 min-h-[280px] flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-gray-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 flex items-center justify-center transition-colors">
              <Plus
                size={28}
                className="text-gray-400 group-hover:text-violet-500 transition-colors"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                Create New Team
              </p>
              <p className="text-xs text-gray-400 max-w-[180px]">
                Start collaborating with a new group
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* ========= LIST VIEW ========= */
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-4 text-left">Team</th>
                  <th className="px-6 py-4 text-left">My Role</th>
                  <th className="px-6 py-4 text-left">Members</th>
                  <th className="px-6 py-4 text-left">Created</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/70">
                {filteredTeams.map((team) => {
                  const color = team.color || "from-violet-500 to-indigo-500";
                  const members = allMembers[team.id] || [];
                  const activeCount = members.filter(
                    (m) => m.status === "active" || m.status === "accepted",
                  ).length;
                  const isOwner = team.ownerId === currentUserId;
                  const created = team.createdAt?.toDate
                    ? team.createdAt.toDate()
                    : team.createdAt
                      ? new Date(team.createdAt)
                      : null;
                  const myRole = isOwner
                    ? "owner"
                    : members.find((m) => m.email === auth.currentUser?.email)
                        ?.role || "member";
                  const rStyle = ROLE_STYLES[myRole];

                  return (
                    <tr
                      key={team.id}
                      onClick={() => openTeamDetail(team)}
                      className="group hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md flex-shrink-0`}
                          >
                            <Briefcase size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {team.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {team.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${rStyle.bg} ${rStyle.text} border-transparent`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${rStyle.dot}`}
                          />
                          <span className="capitalize">{myRole}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1.5">
                            {members.slice(0, 4).map((m) => {
                              const s = ROLE_STYLES[m.role];
                              return (
                                <div
                                  key={m.id}
                                  className={`w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 ${s.bg} flex items-center justify-center ${s.text} text-[10px] font-bold`}
                                  title={m.email}
                                >
                                  {m.email.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {members.length || team.memberCount} total ·{" "}
                            {activeCount} active
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {created ? dayjs(created).format("MMM D, YYYY") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <div
                          className="task-menu-container inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTeamMenu(
                                activeTeamMenu === team.id ? null : team.id,
                              );
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreHorizontal size={17} />
                          </button>
                          {activeTeamMenu === team.id && (
                            <div className="absolute right-6 top-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                              <div className="p-1.5">
                                <button
                                  onClick={() => openTeamDetail(team)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <Users size={15} /> Members
                                </button>
                                {isOwner && (
                                  <>
                                    <button
                                      onClick={() => openEditModal(team)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                      <Edit3 size={15} /> Edit
                                    </button>
                                    <Link
                                      href="/dashboard/teams/edit"
                                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                      <Shield size={15} /> Permissions
                                    </Link>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                    <button
                                      onClick={() => deleteTeam(team)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                                    >
                                      <Trash2 size={15} /> Delete
                                    </button>
                                  </>
                                )}
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
        </div>
      )}

      {/* ====================== MODALS ====================== */}

      {/* ========== CREATE TEAM MODAL ========== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Create New Team
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Set up a new collaborative workspace
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Product Team, Marketing Squad"
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Description{" "}
                  <span className="text-gray-400 font-normal normal-case">
                    (Optional)
                  </span>
                </label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="What is this team working on?"
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base text-gray-900 dark:text-white placeholder-gray-400 min-h-[100px] resize-none"
                />
              </div>

              <div className="pt-2 flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTeamName.trim()}
                  className="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-violet-500/25 disabled:opacity-60 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
                >
                  {creating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {creating ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT TEAM MODAL ========== */}
      {showEditModal && editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Edit Team
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditTeam(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base font-semibold text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none transition-all text-base text-gray-900 dark:text-white min-h-[100px] resize-none"
                />
              </div>
              <div className="pt-2 flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditTeam(null);
                  }}
                  className="px-5 py-3 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editName.trim()}
                  className="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-violet-500/25 disabled:opacity-60 transition-all"
                >
                  {savingEdit ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== TEAM DETAIL + MEMBERS + INVITE MODAL ========== */}
      {showDetailModal && detailTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r ${detailTeam.color || "from-violet-500 to-indigo-500"}`}
            />
            <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 flex-shrink-0">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${detailTeam.color || "from-violet-500 to-indigo-500"} flex items-center justify-center text-white shadow-xl flex-shrink-0`}
                >
                  <Briefcase size={26} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                    {detailTeam.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {detailTeam.description ||
                      "Manage team members, invite colleagues, and collaborate."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-400">
                      <Users size={11} />
                      {detailMembers.length} member
                      {detailMembers.length !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-400">
                      <Check size={11} />
                      {
                        detailMembers.filter(
                          (m) =>
                            m.status === "active" || m.status === "accepted",
                        ).length
                      }{" "}
                      Active
                    </span>
                    {isOwnerOfSelected && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400">
                        <Crown size={11} />
                        You&apos;re the Owner
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailTeam(null);
                  setInviteEmail("");
                }}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Invite Section */}
            {isOwnerOfSelected && (
              <form
                onSubmit={handleInviteMember}
                className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 flex-shrink-0"
              >
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Invite Member by Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="teammate@company.com"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 opacity-0 md:opacity-100 select-none">
                      .
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as "admin" | "member")
                        }
                        className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={inviting}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-violet-500/25 disabled:opacity-60 transition-all"
                      >
                        {inviting ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        <span className="hidden sm:inline">Invite</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Members table list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingDetail ? (
                <div className="p-16 text-center">
                  <Loader2 className="animate-spin w-8 h-8 mx-auto text-violet-500" />
                  <p className="mt-3 text-sm text-gray-500">
                    Loading members...
                  </p>
                </div>
              ) : detailMembers.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <h3 className="font-bold text-gray-700 dark:text-gray-300">
                    No members yet
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Invite people to start collaborating.
                  </p>
                </div>
              ) : (
                <div className="p-5 md:p-6 space-y-2">
                  {detailMembers.map((member) => {
                    const rStyle = ROLE_STYLES[member.role];
                    const sStyle =
                      STATUS_STYLES[member.status] || STATUS_STYLES.pending;
                    const isOwner = member.role === "owner";

                    return (
                      <div
                        key={member.id}
                        className="group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl ${rStyle.bg} flex items-center justify-center ${rStyle.text} font-extrabold shadow-sm border border-white dark:border-gray-800`}
                        >
                          {member.email.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white truncate">
                            {member.email}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${rStyle.bg} ${rStyle.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${rStyle.dot}`}
                              />
                              {member.role}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${sStyle.bg} ${sStyle.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}
                              />
                              {sStyle.label}
                            </span>
                            {member.canEdit && member.status !== "pending" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400">
                                Edit ✔
                              </span>
                            )}
                          </div>
                        </div>

                        {isOwnerOfSelected && !isOwner && (
                          <div className="relative task-menu-container flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMemberMenu(
                                  activeMemberMenu === member.id
                                    ? null
                                    : member.id,
                                );
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreHorizontal size={17} />
                            </button>
                            {activeMemberMenu === member.id && (
                              <div className="absolute right-0 top-10 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-1">
                                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Change Role
                                  </p>
                                  <button
                                    onClick={() =>
                                      changeMemberRole(member.id, "admin")
                                    }
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${member.role === "admin" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                                  >
                                    <Shield size={14} /> Make Admin
                                  </button>
                                  <button
                                    onClick={() =>
                                      changeMemberRole(member.id, "member")
                                    }
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${member.role === "member" ? "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                                  >
                                    <Users size={14} /> Make Member
                                  </button>
                                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                  <button
                                    onClick={() => deleteMember(member.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold"
                                  >
                                    <Trash2 size={14} /> Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isOwner && (
                          <Crown
                            size={18}
                            className="text-amber-500 flex-shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <Link
                href="/dashboard/teams/edit"
                className="flex items-center gap-2 px-4 py-2.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl font-bold text-sm transition-colors"
              >
                <Shield size={15} />
                Advanced Permissions
              </Link>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailTeam(null);
                  setInviteEmail("");
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Done
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Subcomponents ========== */

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
    <div className="group bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={19} className="text-white" />
        </div>
        <TrendingUp
          size={14}
          className="text-green-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
        />
      </div>
      <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {value}
      </div>
      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  color = "text-gray-600 dark:text-gray-400",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-base font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-0.5">
        {label}
      </div>
    </div>
  );
}
