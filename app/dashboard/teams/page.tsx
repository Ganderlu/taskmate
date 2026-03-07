"use client";

import { useState, useEffect } from "react";
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
  Check
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
  onSnapshot
} from "firebase/firestore";

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: any;
  memberCount: number;
}

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "active" | "accepted";
  joinedAt?: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch teams where user is owner or member
      // For simplicity, we'll start with teams owned by user
      const q = query(collection(db, "teams"), where("ownerId", "==", user.uid));
      
      const unsubscribeTeams = onSnapshot(q, (snapshot) => {
        const teamList: Team[] = [];
        snapshot.forEach((doc) => {
          teamList.push({ id: doc.id, ...doc.data() } as Team);
        });
        setTeams(teamList);
        
        // Auto-select first team if none selected
        if (teamList.length > 0 && !selectedTeam) {
          setSelectedTeam(teamList[0]);
        }
        setLoading(false);
      });

      return () => unsubscribeTeams();
    });

    return () => unsubscribeAuth();
  }, []);

  // Fetch members when selected team changes
  useEffect(() => {
    if (!selectedTeam) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    const q = query(
      collection(db, "team_members"), 
      where("teamId", "==", selectedTeam.id)
    );

    const unsubscribeMembers = onSnapshot(q, (snapshot) => {
      const memberList: TeamMember[] = [];
      snapshot.forEach((doc) => {
        memberList.push({ id: doc.id, ...doc.data() } as TeamMember);
      });
      setMembers(memberList);
      setLoadingMembers(false);
    });

    return () => unsubscribeMembers();
  }, [selectedTeam]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTeamName.trim()) return;

    setCreating(true);
    try {
      const teamData = {
        name: newTeamName,
        description: newTeamDesc,
        ownerId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        memberCount: 1
      };

      const docRef = await addDoc(collection(db, "teams"), teamData);
      
      // Add owner as a member
      await addDoc(collection(db, "team_members"), {
        teamId: docRef.id,
        email: auth.currentUser.email,
        role: "owner",
        status: "active",
        joinedAt: new Date().toISOString()
      });

      setNewTeamName("");
      setNewTeamDesc("");
      setShowCreateModal(false);
      // Selection will update automatically via snapshot listener if logic added
      setSelectedTeam({ id: docRef.id, ...teamData } as Team);
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      // Check if already invited/member
      const q = query(
        collection(db, "team_members"), 
        where("teamId", "==", selectedTeam.id),
        where("email", "==", inviteEmail)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert("User is already a member or has a pending invite.");
        setInviting(false);
        return;
      }

      await addDoc(collection(db, "team_members"), {
        teamId: selectedTeam.id,
        email: inviteEmail,
        role: inviteRole,
        status: "pending",
        createdAt: Timestamp.now()
      });

      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      alert("Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Collaborate with your team members and manage access.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={20} />
          <span>Create New Team</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Team List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Your Teams
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-purple-600" />
            </div>
          ) : teams.length === 0 ? (
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">You haven't created any teams yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTeam?.id === team.id
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 ring-1 ring-purple-500"
                      : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800"
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{team.description || "No description"}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Content: Team Details & Members */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTeam ? (
            <>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {selectedTeam.name}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      {selectedTeam.description || "Manage your team members and permissions here."}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium text-sm"
                  >
                    <UserPlus size={18} />
                    Invite Member
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Team Members ({members.length})
                  </h3>

                  {loadingMembers ? (
                    <div className="py-8 text-center">
                      <Loader2 className="animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {members.map(member => (
                        <div key={member.id} className="py-4 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/50 dark:to-blue-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300 font-semibold text-lg">
                              {member.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {member.email}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  member.role === 'owner' 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </span>
                                {member.status === 'pending' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 font-medium">
                                    Pending Invite
                                  </span>
                                )}
                                {member.status === 'accepted' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 font-medium flex items-center gap-1">
                                    <Check size={10} /> Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <Shield className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Select a Team
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Select a team from the sidebar to view details and manage members, or create a new one to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Team</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g. Engineering Team"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none h-24"
                  placeholder="What is this team for?"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite Team Member</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="colleague@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Admins can manage tasks and invite other members.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {inviting && <Loader2 size={16} className="animate-spin" />}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
