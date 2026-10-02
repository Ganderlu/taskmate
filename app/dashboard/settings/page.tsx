"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "../../firebase/firebaseClient";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  deleteUser,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  CreditCard,
  ShieldAlert,
  Camera,
  Globe,
  Clock,
  KeyRound,
  Smartphone,
  Activity,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Save,
  ChevronRight,
  Monitor,
  Sun,
  Moon,
  Laptop,
  CircleDot,
  SlidersHorizontal,
  Sparkles,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  LogOut,
  BadgeCheck,
  Zap,
  CheckCircle2,
  Users,
  HardDrive,
} from "lucide-react";

type SettingsSection =
  | "profile"
  | "security"
  | "notifications"
  | "appearance"
  | "billing"
  | "danger";

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  icon: any;
  gradient: string;
}[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "billing",
    label: "Billing & Plan",
    icon: CreditCard,
    gradient: "from-emerald-500 to-green-500",
  },
  {
    id: "danger",
    label: "Danger Zone",
    icon: ShieldAlert,
    gradient: "from-red-500 to-rose-600",
  },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

const ACCENT_COLORS = [
  {
    name: "Violet",
    value: "from-violet-500 to-purple-500",
    ring: "ring-violet-500",
  },
  { name: "Blue", value: "from-blue-500 to-cyan-500", ring: "ring-blue-500" },
  {
    name: "Emerald",
    value: "from-emerald-500 to-green-500",
    ring: "ring-emerald-500",
  },
  {
    name: "Amber",
    value: "from-amber-500 to-orange-500",
    ring: "ring-amber-500",
  },
  { name: "Rose", value: "from-rose-500 to-pink-500", ring: "ring-rose-500" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string>("/gander.jpg");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwChanging, setPwChanging] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [teamUpdates, setTeamUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [uiTheme, setUiTheme] = useState<string>("system");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value);
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">(
    "normal",
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [dangerEmail, setDangerEmail] = useState("");
  const [dangerPassword, setDangerPassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [teamsCount, setTeamsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTheme = mounted ? theme : "light";

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem("uiTheme");
    if (stored) setUiTheme(stored);
    const storedAccent = localStorage.getItem("accentColor");
    if (storedAccent) setAccentColor(storedAccent);
  }, [mounted]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.uid);
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      if (user.photoURL) setProfileImage(user.photoURL);

      try {
        const prefsDoc = await getDoc(doc(db, "user_preferences", user.uid));
        if (prefsDoc.exists()) {
          const data = prefsDoc.data();
          setBio(data.bio || "");
          setTimezone(data.timezone || "UTC");
          setLanguage(data.language || "en");
          setEmailNotifications(data.emailNotifications ?? true);
          setPushNotifications(data.pushNotifications ?? true);
          setTaskReminders(data.taskReminders ?? true);
          setTeamUpdates(data.teamUpdates ?? true);
          setWeeklyDigest(data.weeklyDigest ?? false);
          setMarketingEmails(data.marketingEmails ?? false);
          setDensity(data.density || "normal");
          setReducedMotion(data.reducedMotion || false);
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      }

      try {
        const tq = query(
          collection(db, "team_members"),
          where("userId", "==", user.uid),
          where("status", "in", ["accepted", "active"]),
        );
        const tsnap = await getDocs(tq);
        setTeamsCount(tsnap.size);
      } catch {
        /* ignore */
      }

      try {
        const tasksQ = query(
          collection(db, "tasks"),
          where("userId", "==", user.uid),
          where("deleted", "==", false),
        );
        const taskSnap = await getDocs(tasksQ);
        setTasksCount(taskSnap.size);
      } catch {
        /* ignore */
      }
    });
    return () => unsub();
  }, [router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploadingImage(true);
    try {
      const imageRef = ref(
        storage,
        `profile-images/${auth.currentUser.uid}.jpg`,
      );
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      setProfileImage(downloadURL);
      setSaveSuccess("Profile picture updated");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      alert("Failed to upload profile picture");
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaveSuccess(null);
    try {
      await updateProfile(auth.currentUser, { displayName });
      await setDoc(
        doc(db, "user_preferences", auth.currentUser.uid),
        {
          displayName,
          bio,
          timezone,
          language,
          emailNotifications,
          pushNotifications,
          taskReminders,
          teamUpdates,
          weeklyDigest,
          marketingEmails,
          density,
          reducedMotion,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setSaveSuccess("Settings saved successfully");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaveSuccess(null);
    try {
      await setDoc(
        doc(db, "user_preferences", auth.currentUser.uid),
        {
          emailNotifications,
          pushNotifications,
          taskReminders,
          teamUpdates,
          weeklyDigest,
          marketingEmails,
          density,
          reducedMotion,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setSaveSuccess("Preferences saved");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (newTheme: string) => {
    setUiTheme(newTheme);
    localStorage.setItem("uiTheme", newTheme);
    if (newTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setTheme(prefersDark ? "dark" : "light");
    } else {
      setTheme(newTheme);
    }
  };

  const applyAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem("accentColor", color);
  };

  const changePassword = async () => {
    setPwError(null);
    setPwSuccess(null);
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    if (!auth.currentUser?.email) return;
    setPwChanging(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess("Password changed successfully");
      setTimeout(() => setPwSuccess(null), 4000);
    } catch (err: any) {
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password"
      ) {
        setPwError("Current password is incorrect");
      } else {
        setPwError("Failed to change password. Please try again.");
      }
    } finally {
      setPwChanging(false);
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser || dangerEmail !== email) {
      alert("Please confirm your email to proceed");
      return;
    }
    setDeletingAccount(true);
    try {
      const credential = EmailAuthProvider.credential(email, dangerPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
      await signOut(auth);
      router.push("/auth/register");
    } catch (err: any) {
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password"
      ) {
        alert("Password is incorrect");
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-6 md:p-8 text-white shadow-2xl shadow-purple-500/20">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-10 right-32 w-20 h-20 bg-white/5 rounded-full border border-white/10" />
        <div className="absolute bottom-10 right-16 w-12 h-12 bg-white/5 rounded-full border border-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-bold">
              <Sparkles size={12} />
              Personalize your workspace
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Account Settings
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
            Manage your profile, secure your account, customize notifications,
            and tune the appearance of TaskMate to match your workflow.
          </p>
        </div>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle2
              size={16}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {saveSuccess}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Section Navigation */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-1 bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/25 dark:to-indigo-900/25 text-violet-700 dark:text-violet-300 font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm ${
                    isActive
                      ? "scale-105"
                      : "opacity-80 group-hover:opacity-100"
                  } transition-transform`}
                >
                  <Icon size={15} className="text-white" />
                </div>
                <span className="text-[13px] flex-1 text-left">
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight
                    size={14}
                    className="text-violet-500 dark:text-violet-400"
                  />
                )}
              </button>
            );
          })}
        </aside>

        {/* Section Content */}
        <div className="space-y-6 min-w-0">
          {/* ============== PROFILE ============== */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              <SectionCard
                title="Profile Information"
                description="Update your personal information and how it appears across TaskMate."
                icon={User}
                gradient="from-violet-500 to-purple-500"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Avatar */}
                  <div className="flex flex-col items-center md:items-start gap-4">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl ring-4 ring-violet-500/20">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="text-white w-6 h-6" />
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors"
                    >
                      <Camera size={13} />
                      Change Avatar
                    </button>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[180px] leading-relaxed">
                      JPG, PNG, GIF up to 5MB. Square photos look best.
                    </p>
                  </div>

                  {/* Fields */}
                  <div className="md:col-span-2 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Display Name" icon={BadgeCheck}>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          className="field-input"
                        />
                      </Field>
                      <Field label="Email Address" icon={Mail}>
                        <div className="field-input flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                          <span className="flex-1 truncate">
                            {email || "—"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                            <Check size={10} />
                            Verified
                          </span>
                        </div>
                      </Field>
                    </div>

                    <Field label="Bio" icon={FileText}>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Tell your team a little about yourself..."
                        className="field-input resize-none"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                        {bio.length}/280 characters
                      </p>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Timezone" icon={Clock}>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="field-input"
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Language" icon={Globe}>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="field-input"
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                      >
                        {saving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============== SECURITY ============== */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <SectionCard
                title="Change Password"
                description="Regularly updating your password helps keep your account secure."
                icon={KeyRound}
                gradient="from-blue-500 to-cyan-500"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Field label="Current Password" icon={Lock}>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="field-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showCurrentPw ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </Field>
                  <div />
                  <Field label="New Password" icon={Lock}>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="field-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm New Password" icon={Lock}>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="field-input"
                    />
                  </Field>
                </div>

                {/* Strength bar */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Strength
                    </span>
                    <div className="flex-1 flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => {
                        const level = getPwStrength(newPassword);
                        const active = i < level;
                        const colors = [
                          "bg-red-400",
                          "bg-orange-400",
                          "bg-amber-400",
                          "bg-emerald-500",
                        ];
                        return (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                              active
                                ? colors[Math.min(level - 1, 3)]
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase w-20 text-right">
                      {getPwStrengthLabel(newPassword)}
                    </span>
                  </div>
                </div>

                {pwError && (
                  <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40">
                    <AlertTriangle
                      size={16}
                      className="text-red-500 mt-0.5 shrink-0"
                    />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {pwError}
                    </p>
                  </div>
                )}
                {pwSuccess && (
                  <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-500 mt-0.5 shrink-0"
                    />
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {pwSuccess}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={changePassword}
                    disabled={
                      pwChanging ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
                  >
                    {pwChanging ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Lock size={16} />
                    )}
                    {pwChanging ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                title="Two-Factor Authentication"
                description="Add an extra layer of security to your account."
                icon={Smartphone}
                gradient="from-blue-500 to-indigo-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                      <Smartphone size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          Authenticator App
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                        Use apps like Google Authenticator, Authy, or 1Password
                        to generate time-based one-time passwords.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      alert(
                        "Coming soon! 2FA setup will be available in the next update.",
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs transition-colors shrink-0"
                  >
                    <Zap size={13} />
                    Enable Soon
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Login Activity"
                description="Review devices and locations that have recently accessed your account."
                icon={Activity}
                gradient="from-indigo-500 to-violet-500"
              >
                <div className="space-y-2">
                  {[
                    {
                      device: "Chrome on Windows",
                      location: "Current Session · Just now",
                      ip: "Your device",
                      current: true,
                    },
                    {
                      device: "Firefox on macOS",
                      location: "2 hours ago",
                      ip: "IP: 192.168.1.x",
                      current: false,
                    },
                    {
                      device: "Safari on iPhone 15",
                      location: "Yesterday · 6:42 PM",
                      ip: "Mobile network",
                      current: false,
                    },
                  ].map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                        entry.current
                          ? "bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-900/40"
                          : "bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:border-gray-200"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          entry.current
                            ? "bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Monitor
                          size={18}
                          className={
                            entry.current ? "text-white" : "text-gray-500"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {entry.device}
                          </p>
                          {entry.current && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.location}
                          </span>
                          <span className="text-[10px] text-gray-300 dark:text-gray-600">
                            ·
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {entry.ip}
                          </span>
                        </div>
                      </div>
                      {!entry.current && (
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                          Sign out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============== NOTIFICATIONS ============== */}
          {activeSection === "notifications" && (
            <SectionCard
              title="Notification Preferences"
              description="Choose how and when you receive updates from TaskMate."
              icon={Bell}
              gradient="from-amber-500 to-orange-500"
            >
              <div className="space-y-1">
                <ToggleRow
                  title="Email Notifications"
                  description="Receive important updates via email."
                  icon={Mail}
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                  gradient="from-violet-500 to-indigo-500"
                />
                <ToggleRow
                  title="Push Notifications"
                  description="Get real-time push alerts on your devices."
                  icon={Bell}
                  checked={pushNotifications}
                  onChange={setPushNotifications}
                  gradient="from-blue-500 to-cyan-500"
                />
                <div className="h-px my-2 mx-1 bg-gray-100 dark:bg-gray-800" />
                <ToggleRow
                  title="Task Reminders"
                  description="Nudges before upcoming tasks are due."
                  icon={Zap}
                  checked={taskReminders}
                  onChange={setTaskReminders}
                  gradient="from-amber-500 to-orange-500"
                />
                <ToggleRow
                  title="Team Updates"
                  description="Changes to teams you're a member of."
                  icon={Users}
                  checked={teamUpdates}
                  onChange={setTeamUpdates}
                  gradient="from-emerald-500 to-green-500"
                />
                <ToggleRow
                  title="Weekly Digest"
                  description="Productivity summary every Monday morning."
                  icon={FileText}
                  checked={weeklyDigest}
                  onChange={setWeeklyDigest}
                  gradient="from-indigo-500 to-violet-500"
                />
                <div className="h-px my-2 mx-1 bg-gray-100 dark:bg-gray-800" />
                <ToggleRow
                  title="Marketing & Tips"
                  description="Occasional product tips, new features, and offers."
                  icon={Sparkles}
                  checked={marketingEmails}
                  onChange={setMarketingEmails}
                  gradient="from-pink-500 to-rose-500"
                  subtle
                />
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={savePrefs}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </SectionCard>
          )}

          {/* ============== APPEARANCE ============== */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <SectionCard
                title="Theme Mode"
                description="Choose how TaskMate looks on your device."
                icon={Palette}
                gradient="from-pink-500 to-rose-500"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ThemeChoice
                    label="Light"
                    icon={Sun}
                    active={uiTheme === "light"}
                    onClick={() => applyTheme("light")}
                    previewBg="from-gray-50 to-gray-100"
                    previewAccent="from-violet-500 to-purple-500"
                  />
                  <ThemeChoice
                    label="Dark"
                    icon={Moon}
                    active={uiTheme === "dark"}
                    onClick={() => applyTheme("dark")}
                    previewBg="from-gray-900 to-gray-950"
                    previewAccent="from-violet-500 to-purple-500"
                  />
                  <ThemeChoice
                    label="System"
                    icon={Laptop}
                    active={uiTheme === "system"}
                    onClick={() => applyTheme("system")}
                    previewBg="from-blue-50 via-white to-gray-900"
                    previewAccent="from-violet-500 to-purple-500"
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Accent Color"
                description="Pick a color that feels right for you."
                icon={CircleDot}
                gradient="from-pink-500 to-rose-500"
              >
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {ACCENT_COLORS.map((c) => {
                    const selected = accentColor === c.value;
                    return (
                      <button
                        key={c.name}
                        onClick={() => applyAccent(c.value)}
                        className={`group relative aspect-square rounded-2xl p-1 transition-all ${
                          selected
                            ? `ring-2 ${c.ring} ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-105`
                            : "hover:scale-105"
                        }`}
                        title={c.name}
                      >
                        <div
                          className={`w-full h-full rounded-xl bg-gradient-to-br ${c.value} shadow-md group-hover:shadow-lg transition-shadow`}
                        />
                        {selected && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Check
                              size={16}
                              className="text-white drop-shadow-md"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Layout & Motion"
                description="Fine-tune density and animations."
                icon={SlidersHorizontal}
                gradient="from-pink-500 to-rose-500"
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                      Density
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["compact", "normal", "comfortable"] as const).map(
                        (d) => {
                          const heights = {
                            compact: "h-2",
                            normal: "h-3",
                            comfortable: "h-4",
                          };
                          return (
                            <button
                              key={d}
                              onClick={() => setDensity(d)}
                              className={`p-4 rounded-2xl border-2 transition-all ${
                                density === d
                                  ? "border-violet-500 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/15"
                                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                              }`}
                            >
                              <div className="space-y-1.5 mb-3">
                                {[0, 1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className={`w-full ${heights[d]} rounded-md bg-gradient-to-r from-violet-400/50 to-indigo-400/50 dark:from-violet-500/40 dark:to-indigo-500/40`}
                                  />
                                ))}
                              </div>
                              <p
                                className={`text-xs font-bold capitalize ${
                                  density === d
                                    ? "text-violet-700 dark:text-violet-300"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                {d}
                              </p>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <ToggleRow
                      title="Reduce Motion"
                      description="Minimize animations and transitions throughout the app."
                      icon={Sparkles}
                      checked={reducedMotion}
                      onChange={setReducedMotion}
                      gradient="from-pink-500 to-rose-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={savePrefs}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:shadow-pink-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {saving ? "Saving..." : "Save Appearance"}
                  </button>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============== BILLING ============== */}
          {activeSection === "billing" && (
            <div className="space-y-6">
              <SectionCard
                title="Current Plan"
                description="Your subscription and usage overview."
                icon={CreditCard}
                gradient="from-emerald-500 to-green-500"
              >
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 p-6 md:p-7 text-white shadow-2xl shadow-emerald-500/25 mb-6">
                  <div className="absolute -top-20 -right-16 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-16 -left-10 w-52 h-52 bg-teal-300/15 rounded-full blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-extrabold uppercase tracking-wider">
                          Free Plan
                        </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        Starter
                      </h3>
                      <p className="text-white/80 text-sm max-w-md leading-relaxed">
                        Perfect for personal productivity. Upgrade anytime for
                        team collaboration, AI-powered prioritization, and
                        unlimited projects.
                      </p>
                    </div>
                    <button
                      onClick={() => alert("Upgrade flow coming soon!")}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-700 hover:bg-white/95 hover:scale-[1.02] font-extrabold shadow-lg shadow-black/10 transition-all self-start"
                    >
                      <Zap size={17} />
                      Upgrade to Pro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <UsageStat
                    label="Active Tasks"
                    used={tasksCount}
                    total={100}
                    icon={CheckCircle2}
                    gradient="from-violet-500 to-purple-500"
                  />
                  <UsageStat
                    label="Teams"
                    used={teamsCount}
                    total={3}
                    icon={Users}
                    gradient="from-blue-500 to-cyan-500"
                  />
                  <UsageStat
                    label="Projects"
                    used={0}
                    total={10}
                    icon={FileText}
                    gradient="from-amber-500 to-orange-500"
                  />
                  <UsageStat
                    label="Storage"
                    used={12}
                    total={100}
                    icon={HardDrive}
                    gradient="from-pink-500 to-rose-500"
                    unit="MB"
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Payment Method"
                description="Manage your saved payment methods."
                icon={CreditCard}
                gradient="from-emerald-500 to-green-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shrink-0">
                      <CreditCard size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                        No payment method on file
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                        You're on the free plan. Add a payment method to upgrade
                        or to prevent service disruption if you exceed limits.
                      </p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors shrink-0">
                    <CreditCard size={13} />
                    Add Card
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                title="Billing History"
                description="Past invoices and receipts."
                icon={FileText}
                gradient="from-emerald-500 to-green-500"
              >
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900/40">
                    <FileText size={34} className="text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    No invoices yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    When you upgrade or make a purchase, your receipts will
                    appear here.
                  </p>
                  <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                    <Check
                      size={13}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Currently on the free plan · No charges
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============== DANGER ZONE ============== */}
          {activeSection === "danger" && (
            <SectionCard
              title="Danger Zone"
              description="Irreversible actions for your account. Proceed with caution."
              icon={ShieldAlert}
              gradient="from-red-500 to-rose-600"
            >
              {/* Sign out everywhere */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                    <LogOut size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-1">
                      Sign out of all devices
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                      Log out of every browser and device currently signed in to
                      your account. You'll need to sign in again on each one.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    alert("Signed out of all other devices (simulated)")
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs transition-colors shrink-0"
                >
                  <LogOut size={13} />
                  Sign out everywhere
                </button>
              </div>

              {/* Deactivate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                    <Activity size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-1">
                      Deactivate account
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                      Temporarily pause your account. Your data is preserved but
                      inaccessible until you reactivate by signing in.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => alert("Deactivation coming soon")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-bold text-xs transition-colors shrink-0"
                >
                  <Activity size={13} />
                  Deactivate
                </button>
              </div>

              {/* Delete */}
              <div className="p-5 rounded-2xl border-2 border-red-300 dark:border-red-900/50 bg-gradient-to-br from-red-50 to-white dark:from-red-900/15 dark:to-gray-900">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
                    <Trash2 size={22} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                      Permanently delete account
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-[10px] font-bold uppercase tracking-wider">
                        <AlertTriangle size={9} /> Irreversible
                      </span>
                    </h4>
                    <p className="text-sm text-red-600/80 dark:text-red-300/80 max-w-xl leading-relaxed">
                      This will erase all your tasks, projects, team
                      memberships, preferences, and files — everything. We will
                      not be able to recover this data.
                    </p>
                  </div>
                </div>

                {!showDangerConfirm ? (
                  <button
                    onClick={() => setShowDangerConfirm(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    <Trash2 size={16} />I want to delete my account
                  </button>
                ) : (
                  <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/40">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                      <AlertTriangle
                        size={16}
                        className="text-red-500 shrink-0"
                      />
                      <p className="text-xs font-bold text-red-700 dark:text-red-300 leading-relaxed">
                        To confirm, please type your full email ({email}) and
                        current password below.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Field label="Confirm Email" icon={Mail}>
                        <input
                          type="text"
                          value={dangerEmail}
                          onChange={(e) => setDangerEmail(e.target.value)}
                          placeholder={email || "you@example.com"}
                          className="field-input"
                        />
                      </Field>
                      <Field label="Current Password" icon={Lock}>
                        <input
                          type="password"
                          value={dangerPassword}
                          onChange={(e) => setDangerPassword(e.target.value)}
                          placeholder="Enter password to confirm"
                          className="field-input"
                        />
                      </Field>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowDangerConfirm(false);
                          setDangerEmail("");
                          setDangerPassword("");
                        }}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteAccount}
                        disabled={
                          deletingAccount ||
                          dangerEmail !== email ||
                          !dangerPassword
                        }
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                      >
                        {deletingAccount ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                        {deletingAccount
                          ? "Deleting..."
                          : "Yes, delete forever"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border-radius: 0.85rem;
          background: #ffffff;
          color: #111827;
          font-size: 0.875rem;
          font-weight: 500;
          border: 1.5px solid #e5e7eb;
          outline: none;
          transition: all 0.2s;
        }
        .dark .field-input {
          background: #0f172a;
          color: #e5e7eb;
          border-color: #1f2937;
        }
        .field-input::placeholder {
          color: #9ca3af;
        }
        .field-input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }
      `}</style>
    </div>
  );
}

/* ========== Helpers ========== */

function getPwStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}

function getPwStrengthLabel(pw: string): string {
  const s = getPwStrength(pw);
  if (s <= 1) return "Weak";
  if (s === 2) return "Fair";
  if (s === 3) return "Good";
  return "Strong";
}

/* ========== Reusable Subcomponents ========== */

function SectionCard({
  title,
  description,
  icon: Icon,
  gradient,
  children,
}: {
  title: string;
  description?: string;
  icon: any;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <header className="flex items-start gap-3 p-6 border-b border-gray-100 dark:border-gray-800">
        <div
          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}
        >
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-gray-400" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  icon: Icon,
  checked,
  onChange,
  gradient,
  subtle,
}: {
  title: string;
  description: string;
  icon: any;
  checked: boolean;
  onChange: (v: boolean) => void;
  gradient: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`flex items-start sm:items-center justify-between gap-4 p-4 rounded-2xl transition-colors ${
        subtle ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
            checked ? "opacity-100" : "opacity-70"
          }`}
        >
          <Icon size={15} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${
          checked
            ? `bg-gradient-to-r ${gradient}`
            : "bg-gray-200 dark:bg-gray-700"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function ThemeChoice({
  label,
  icon: Icon,
  active,
  onClick,
  previewBg,
  previewAccent,
}: {
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
  previewBg: string;
  previewAccent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
        active
          ? "border-violet-500 dark:border-violet-400 bg-violet-50/40 dark:bg-violet-900/15 shadow-lg shadow-violet-500/15"
          : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900/50"
      }`}
    >
      <div
        className={`w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${previewBg} border border-black/5 dark:border-white/10 p-2.5 shadow-inner relative overflow-hidden`}
      >
        <div className="absolute top-2 left-2 flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400/70" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
        </div>
        <div
          className={`absolute top-5 left-3 right-3 h-1.5 rounded-full bg-gradient-to-r ${previewAccent} opacity-80`}
        />
        <div className="absolute bottom-3 left-3 right-5 space-y-1.5">
          <div
            className={`h-1.5 w-3/4 rounded-full bg-gradient-to-r ${previewAccent} opacity-60`}
          />
          <div className="h-1.5 w-1/2 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-1.5 w-5/6 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={
            active ? "text-violet-600 dark:text-violet-400" : "text-gray-400"
          }
        />
        <span
          className={`text-xs font-extrabold ${
            active
              ? "text-violet-700 dark:text-violet-300"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {label}
        </span>
        {active && (
          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center shadow-md">
            <Check size={10} className="text-white" />
          </span>
        )}
      </div>
    </button>
  );
}

function UsageStat({
  label,
  used,
  total,
  icon: Icon,
  gradient,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  icon: any;
  gradient: string;
  unit?: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, total)) * 100));
  return (
    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
        >
          <Icon size={15} className="text-white" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none mb-1">
        {used}
        <span className="text-sm text-gray-400 font-bold ml-1">
          / {total}
          {unit || ""}
        </span>
      </p>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
