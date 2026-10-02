# User Settings Page Implementation Plan

## Repository Research

### Current state
- **Settings route** (linked in the Sidebar at "Account" group: `/dashboard/settings`) — **does not exist yet**. 404s.
- **Existing dashboard layout:** Sidebar + Topbar wrapping via `DashboardLayout` — every page lives in `app/dashboard/` with `"use client"` pattern. Container: main wrapper is `max-w-7xl mx-auto`, background `bg-gray-50 dark:bg-gray-950`, smooth fade-in animation on mount.
- **Design system (studied across teams/dashboard/notifications/storage):
  - Gradient hero header (`from-purple/via-indigo/to-blue + `Poppins font everywhere.
  - Section cards: `bg-white dark:bg-gray-900 rounded-2xl/3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm`.
  - Form labels: `<text-xs font-bold uppercase tracking-wider` with an accent color on a tiny label, `text-[color-600 dark:text-[color]-400` paired with section icon.
  - Form inputs: `w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 outline-none transition`.
  - Primary buttons: `bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:via-indigo-700 hover:to-violet-700 rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 transition-all`.
  - Mobile-first responsive patterns (sm: / md: / lg: media queries throughout.
  - Status chip pattern: rounded badge with colored dot + label variant.
  - Empty states use dashed border + icon.
- **User data model**
  - Firebase Auth profile has `displayName`, `email`, `photoURL`, `uid`, `emailVerified` (boolean).
  - Firestore doc `/users/{uid}` exists (rules allow read/write if `uid == request.auth.uid`). Currently written on register with fields `displayName, photoURL`.
  - Profile photo is uploaded via Cloudinary and written via `updateProfile(user, { photoURL: url })` as seen in Sidebar/Topbar already.
- **Settings UX expectations**
  - Users expect a typical 6-section professional settings layout: 1) Profile, 2) Account Security, 3) Notifications, 4) Appearance, 5) Data & Storage, 6) Danger Zone.
  - Mobile-first, all sections responsive.

### Constraints
- **Firebase Auth: Password change requires `reauthenticateWithCredential` (before `updatePassword`). Must catch and explain gracefully when user recently signed **Out and needs password prompt. No new dependencies (`re-authenticate logic should not pull in anything else; we already have `EmailAuthProvider credential already imported pattern in imports elsewhere, import from `firebase/auth`.

## Files and Modules

| File | Change
| --- | --- |
|`c:\Users\User\Desktop\_ai\taskmate-ai\app\dashboard\settings\page.tsx` | **New file.** Main Settings page with 6 sections, all save states, hydration-safe theme, success/error toast UX, mobile responsive, + save states, responsive left-sidebar section nav on desktop. |
|`c:\Users\User\Desktop\_ai\taskmate-ai\firestore.rules` | Already correct `/users/{uid}` rules are; already allow read/write uid—✅ no change needed. Add note for profile fields beyond what's there: already sufficient (no rule change needed. |
|`c:\Users\User\Desktop\_ai\taskmate-ai\app\globals.css` | No change needed unless a global class; styles already exist for all needed in input/button/toast patterns covered with existing styles needed. |

## Implementation Steps (dependency order)

1. **Create `/dashboard/settings/page.tsx** skeleton** (with`"use client"` import of imports, all needed from existing patterns — lucide icons + auth + db):

   a. Import all needed imports from `"lucide-react`** **→User, Mail, Lock, Bell, Palette (Appearance), HardDrive, Trash2, Shield, KeyRound, Upload, Camera, Eye, EyeOff, AlertTriangle, Check, Loader2, ChevronRight, Crown, LogOut, AlertCircle, Save, Sun, Moon, Smartphone, Globe, CreditCard, X, ArrowRightFromLine, RotateCcw, CreditCard as CreditCardIcon, BellRing — exactly as needed.

   b. Build the 6 sections UI:

   - **Section 1 — Profile**
     - Profile photo upload (reuse Cloudinary upload flow same pattern as Sidebar for profile image change with updateProfile photoURL).
     - Full name input, Display name (displayName), Email (read-only + "Send verification" button if !emailVerified), Phone (optional text field to /users/uid doc), Job title, Company / Bio (stored on users doc).
     - Save changes button with saving state, per-section saving with checkmark toast.

   - **Section 2 — Security**
     - Current password, New password, Confirm new password fields, toggle visibility.
     - Update password button; with reauthentication-first flow using EmailAuthProvider.credential + updatePassword, with friendly error handling "wrong reauth password with toast explaining.
     - Active sessions card with current session details from last sign-in time from auth.

   - **Section 3 — Notifications** preference toggles
     - Email for team invite, task deadline reminder, weekly digest, marketing/newsletter toggle chips pattern with gradient toggle switch pill (like Sidebar Theme toggle variant).
     - Product in-app push; Browser notifications permission toggle chip.
     - Stored on `/users/{uid}` under `notificationPrefs` field map.

   - **Section 4 — Appearance**
     - light/dark/system toggle with Sun /Dark/System three selector (like sidebar 3-tab selector with 3-option radio-group-pill segment button, selected filled gradient selected).
     - Density (default-density options) — stored on users doc or localStorage as fallback used with useTheme.

   - **Section 5 — Data & Storage**
     - Usage summary stats bar of storage from listAll sum sizes pattern copied from storage page logic.
     - Export personal data button JSON download of tasks/projects/categories JSON collections.
     - Clear cached data button localStorage.

   - **Section 6 — Danger Zone**
     - Red alert triangle + "Delete account". Warn user().currentUser with reauth. Delete Firestore user doc; show confirmation + typed account email double check type confirmation prompt.
     - Log out button with signOut()

2. **Left-hand side sub-navigation on desktop** for section links to sections; sticky right-left layout (sticky left nav with active section scroll.

3. **Success toast inline/inline inline-success component — no separate file needed.

4. **Fix sidebar nav** links — already points to /dashboard/settings link active classes in Sidebar.tsx — no changes.

5. **Update firestore rules** — `/users/{uid}` are already good. Note about storing new fields not required because rules allow write entire doc already — no edits needed to mention.

6. **Build validation** — `npm run build` successful exit code 0. Page loads navigation from sidebar.

## Dependencies and Considerations

- **No new npm packages.** Uses existing: lucide, firebase, tailwind, dayjs.
- **Hydration mismatch** — use `mounted` guard for theme selector (appearance section render default "Light/Dark/System matches sidebar pattern with SSR safe.
- **Reauthentication** — when re catch and handle gracefully. Must handle wrong old password with inline toast. Never log raw errors; user-friendly message instead.
- **Form UX success toasts** — each save buttons on section-level saving state with inline `Saved ✓` plus Loader2 spinner + success/error, auto-dismiss with setTimeout-based 4s.
- **Mobile first** — desktop two column only on `lg:grid-cols-[256px_1fr] layout; mobile, mobile sections full-width. Sticky left nav only on lg screens. Collapse for mobiles stack sections stacked panels stack only.
- **Existing storage logic summary from Storage: reuse existing listAll + sum sizes storage logic — import all storage usage summary reuse logic reuse sum sizes. Don't rebuild. storage.rules already present. Check storage page — `/users/${uid}/files` prefix OK because from storage rules allowed.

## Validation

- `npm run build` → exit 0
- Navigate Sidebar → Settings → render 6 panels stack on mobile.
- Profile: change display name → save → Firebase Auth → reflect correctly.
- Password update flow with reauth password wrong scenario shows inline user-friendly message.
- Appearance theme selector toggle light/dark/system matches SSR safe and no hydration mismatch warning.
- Delete account flow confirms via reauth correct; reauth wrong password prompt account actually deletion actually cancel doesn't without type email confirm before delete account deletion; signOut correctly after successful after account after LogOut button works.
- All permissions for `/users/{uid}` writes to users/{uid}.{` doc with updateDoc doc already good — Firestore write Firestore console rules have user match write.

## Risks

| Risk | Handling |
|---|---|
| Cloudinary image upload fails (CORS | Inline error toast. Fallback user-friendly onError handler around around try/catch around wrap all with message. |
| Reauth failure on password → wrong old password | "Current password is incorrect. Please try again." — not stack with Inline toast error message. |
| emailVerified (displaying as fallback) button sendEmailVerification user with beforeAuth → explain | show friendly success toast. |
| storage.rules list storage getDownloadURL in listAll catch fallback | "Storage permission denied → show 0% usage with hint in the storage usage panel. |
