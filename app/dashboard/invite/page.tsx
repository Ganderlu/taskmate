"use client";

import { useState } from "react";
import { 
  Copy, 
  Check, 
  Mail, 
  Share2, 
  Gift, 
  Users,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { auth } from "../../firebase/firebaseClient";

export default function InviteFriendPage() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // In a real app, this would be a dynamic link with a referral code
  const inviteLink = "https://taskmate.ai/invite/u/" + (auth.currentUser?.uid || "guest");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setInviting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setInviting(false);
    setEmail("");
    alert(`Invitation sent to ${email}!`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on TaskMate',
          text: 'Boost your productivity with TaskMate! Join me and get started for free.',
          url: inviteLink,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10">
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
          <Gift className="w-12 h-12 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Invite Friends to TaskMate
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Productivity is better together. Invite your friends and colleagues to collaborate and get things done faster.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Copy Link Section */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Share2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Link</h2>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Copy your unique referral link and share it anywhere.
          </p>

          <div className="relative group">
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 pr-2">
              <input 
                type="text" 
                readOnly 
                value={inviteLink}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-300 px-3 font-mono text-sm truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  copied 
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30" 
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <button 
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={18} /> Share via...
            </button>
          </div>
        </div>

        {/* Email Invite Section */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-purple-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Mail size={24} />
            </div>
            <h2 className="text-xl font-bold">Invite via Email</h2>
          </div>
          
          <p className="text-purple-100 mb-6">
            Send a direct invitation to your friend's inbox.
          </p>

          <form onSubmit={handleEmailInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-100 mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-purple-200 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={inviting}
              className="w-full py-3 bg-white text-purple-600 hover:bg-purple-50 rounded-xl font-bold shadow-lg shadow-black/10 transition-all transform active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {inviting ? (
                "Sending..."
              ) : (
                <>
                  Send Invite <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        {[
          {
            icon: Users,
            title: "Collaborate",
            desc: "Work together on projects and tasks in real-time."
          },
          {
            icon: Sparkles,
            title: "Boost Productivity",
            desc: "Help your friends get organized and achieve more."
          },
          {
            icon: Gift,
            title: "Earn Rewards",
            desc: "Unlock premium features when friends join."
          }
        ].map((item, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center hover:bg-white dark:hover:bg-gray-900 transition-colors duration-300">
            <div className="w-12 h-12 mx-auto bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-purple-600 shadow-sm mb-4">
              <item.icon size={24} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
