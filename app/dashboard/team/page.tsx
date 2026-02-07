"use client";

import { useState, useEffect } from "react";
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
  getCountFromServer,
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
  LayoutGrid,
  Settings,
  ArrowLeft,
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
}

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "pending";
  addedAt: string;
  teamId?: string;
  userId?: string;
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "manage">("list");

  // Create Team State
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserTeams(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all teams created by user
  const fetchUserTeams = async (userId: string) => {
    try {
      const q = query(collection(db, "teams"), where("ownerId", "==", userId));
      const snapshot = await getDocs(q);

      const teamList = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const teamData = docSnapshot.data();
          const teamId = docSnapshot.id;

          // Fetch member count
          const membersQuery = query(
            collection(db, "team_members"),
            where("teamId", "==", teamId),
          );

          let memberCount = 0;
          try {
            const countSnapshot = await getCountFromServer(membersQuery);
            memberCount = countSnapshot.data().count;
          } catch (err) {
            console.error("Error fetching member count:", err);
          }

          return {
            id: teamId,
            ...teamData,
            memberCount,
          } as Team;
        }),
      );

      setTeams(teamList);

      // If user has no teams, show create view
      if (teamList.length === 0) {
        setView("create");
      } else if (view !== "create" && view !== "manage") {
        // Only force list view if not already in create/manage (preserves state on refresh if we were handling that, but here it's mostly initial load)
        // Actually, the original logic was:
        // if (teamList.length === 0) setView("create") else setView("list")
        // But fetchUserTeams is called on auth state change (mount).
        // If I reload page, it fetches.
        setView("list");
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch teams when returning to list view to update counts
  useEffect(() => {
    if (view === "list" && auth.currentUser) {
      fetchUserTeams(auth.currentUser.uid);
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
      const list = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TeamMember,
      );
      setMembers(list);
    });

    return () => unsubscribe();
  }, [selectedTeam]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !auth.currentUser) return;

    setCreatingTeam(true);
    try {
      const newTeam = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "teams"), newTeam);
      const teamWithId = { id: docRef.id, ...newTeam, memberCount: 1 };

      // Add owner as the first member (admin)
      const ownerMember = {
        ownerId: auth.currentUser.uid,
        userId: auth.currentUser.uid,
        teamId: docRef.id,
        email: auth.currentUser.email || "",
        role: "admin",
        status: "active",
        addedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "team_members"), ownerMember);

      setTeams([...teams, teamWithId]);
      setSelectedTeam(teamWithId);
      setView("manage");

      // Reset form
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
      // Check if already exists locally
      const exists = members.some((m) => m.email === inviteEmail);
      if (exists) {
        alert("This user is already in this team.");
        setSending(false);
        return;
      }

      const newMember = {
        ownerId: auth.currentUser.uid,
        teamId: selectedTeam.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "pending",
        addedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "team_members"), newMember);

      setMembers([...members, { ...newMember, id: docRef.id } as TeamMember]);
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
      setMembers(members.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // VIEW: CREATE TEAM
  if (view === "create") {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-500">
        <div className="mb-8">
          {teams.length > 0 && (
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={20} />
              <span>Back to Teams</span>
            </button>
          )}
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/10 transform rotate-3">
              <Briefcase className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {teams.length === 0
                ? "Set Up Your First Team"
                : "Create New Team"}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Create a workspace to collaborate with your team members.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleCreateTeam} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Team Name
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Acme Corp, Design Team"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none transition-all text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="What is this team working on?"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none transition-all text-base text-gray-900 dark:text-white placeholder-gray-400 min-h-[120px] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creatingTeam || !teamName.trim()}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              {creatingTeam ? (
                <>
                  <Loader2 className="animate-spin w-6 h-6" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Team</span>
                  <ArrowRight size={20} />
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
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Teams
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Select a team to manage or create a new one.
            </p>
          </div>
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 font-medium"
          >
            <Plus size={20} />
            <span>New Team</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setSelectedTeam(t);
                setView("manage");
              }}
              className="group bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-purple-500/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="text-purple-500" />
              </div>

              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 pr-6 truncate">
                {t.name}
              </h3>

              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 h-10">
                {t.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                <span>
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-full group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                  <Users size={14} />
                  <span className="font-semibold">{t.memberCount || 0}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Create Card (Alternative) */}
          <button
            onClick={() => setView("create")}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group h-full min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
            </div>
            <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
              Create Another Team
            </span>
          </button>
        </div>
      </div>
    );
  }

  // VIEW: MANAGE TEAM (Dashboard)
  if (!selectedTeam) return null; // Should not happen

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          <span>Back to all teams</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Briefcase
                  size={20}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedTeam.name}
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {selectedTeam.description ||
                "Manage your team members and permissions."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">New Team</span>
            </button>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 font-medium"
            >
              <UserPlus size={20} />
              <span>Invite Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite Modal / Section */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Invite to {selectedTeam.name}
            </h2>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="colleague@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["member", "admin", "viewer"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                        inviteRole === role
                          ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Your team is empty
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Start building your dream team by inviting colleagues to
              collaborate on projects.
            </p>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="mt-6 text-purple-600 dark:text-purple-400 font-medium hover:underline"
            >
              Invite your first member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          member.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(member.addedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove member"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
