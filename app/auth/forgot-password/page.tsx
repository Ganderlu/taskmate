"use client";

import { useState } from "react";
import { auth } from "../../firebase/firebaseClient";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errorMessage = "Failed to send reset email.";
      if (err.code === "auth/user-not-found") errorMessage = "No user found with this email.";
      if (err.code === "auth/invalid-email") errorMessage = "Invalid email address.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/nature3.jpg')" }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white h-full">
          <div>
            <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit">
              <ArrowLeft size={20} /> Back to Home
            </Link>
          </div>
          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight">
              Don't worry, <br/>
              <span className="text-purple-400">we got you.</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-md">
              Recover access to your account and get back to being productive in no time.
            </p>
          </div>
          <div className="text-sm text-gray-400">
            © 2024 TaskMate AI. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
              <ArrowLeft size={20} /> Back
            </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-600 dark:text-green-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Check your inbox
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your email and follow the instructions.
                </p>
              </div>
              <Link 
                href="/auth/login"
                className="block w-full text-center py-3 px-4 rounded-xl text-white bg-purple-600 hover:bg-purple-700 font-medium shadow-lg shadow-purple-500/30 transition-all"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all dark:text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 font-medium shadow-lg shadow-purple-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </button>
              
              <div className="text-center">
                <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Back to Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
