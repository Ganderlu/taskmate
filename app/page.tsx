"use client";

import { useState } from "react";
import { Menu, X, CheckCircle, ArrowRight, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "./components/ThemeToggle";
import Footer from "./components/Footer";

export default function Home() {
  const [openMenu, setOpenMenu] = useState(false);
  const router = useRouter();

  const categories = [
    "School",
    "Work",
    "Personal",
    "Business",
    "Teams",
    "Freelancer",
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ------------------------------------------
          NAVBAR
      ------------------------------------------- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => router.push("/")}
            >
              {/* Replace with your logo or use text */}
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                TaskMate
              </span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                How it Works
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                Testimonials
              </a>
            </div>

            {/* Desktop right buttons */}
            <div className="hidden md:flex items-center gap-4">
              <ModeToggle />
              <button
                className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium"
                onClick={() => router.push("/auth/login")}
              >
                Log in
              </button>
              <button
                className="px-5 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-500/30"
                onClick={() => router.push("/auth/register")}
              >
                Sign Up Free
              </button>
            </div>

            {/* Mobile Menu Icon */}
            <div className="flex md:hidden items-center gap-4">
              <ModeToggle />
              <button
                onClick={() => setOpenMenu(!openMenu)}
                className="text-gray-600 dark:text-gray-300"
              >
                {openMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE DROPDOWN MENU */}
        {openMenu && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <a
                href="#features"
                className="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                onClick={() => setOpenMenu(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                onClick={() => setOpenMenu(false)}
              >
                How it Works
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                onClick={() => setOpenMenu(false)}
              >
                Testimonials
              </a>
              <div className="pt-4 flex flex-col gap-3">
                <button
                  className="w-full py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => router.push("/auth/login")}
                >
                  Log in
                </button>
                <button
                  className="w-full py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => router.push("/auth/register")}
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-16">
        {/* ------------------------------------------
            HERO SECTION
        ------------------------------------------- */}
        <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/landing.jpg"
              alt="Background"
              className="w-full h-full object-cover"
            />
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
                Master Your Day with <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                  AI-Powered Productivity
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-200 mb-10 leading-relaxed font-medium">
                TaskMate AI helps you schedule, track, and automate your tasks
                effortlessly. Experience the future of productivity management.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-5">
                <button
                  className="px-8 py-4 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-all shadow-xl hover:shadow-purple-500/40 flex items-center justify-center gap-2 transform hover:-translate-y-1"
                  onClick={() => router.push("/auth/register")}
                >
                  Get Started for Free <ArrowRight size={20} />
                </button>
                <button
                  className="px-8 py-4 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  onClick={() => router.push("/demo")}
                >
                  View Demo
                </button>
              </div>
            </div>
          </div>

          {/* Background Gradients - Subtle overlay on top of image if needed, or remove if too busy */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none opacity-40">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400 dark:bg-purple-600 rounded-full blur-3xl opacity-30 mix-blend-overlay animate-blob"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400 dark:bg-blue-600 rounded-full blur-3xl opacity-30 mix-blend-overlay animate-blob animation-delay-2000"></div>
          </div>
        </section>

        {/* ------------------------------------------
            CATEGORIES
        ------------------------------------------- */}
        <div className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 py-8">
          <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
            <div className="flex justify-center gap-4 min-w-max md:min-w-0">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-6 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium shadow-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------
            HOW IT WORKS SECTION
        ------------------------------------------- */}
        <section id="how-it-works" className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-base font-semibold text-purple-600 tracking-wide uppercase">
                Workflow
              </h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                How TaskMate Works
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto">
                Simple, intuitive, and powerful. Get organized in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                {
                  title: "Effortless Productivity",
                  desc: "Automated scheduling and AI-powered assistance.",
                  img: "/effort.png",
                },
                {
                  title: "Track & Adjust",
                  desc: "Mark done, shift tasks or let AI re-plan everything.",
                  img: "/ring.png",
                },
                {
                  title: "Instant Smart Tasks",
                  desc: "Generate tasks and deadlines just by speaking.",
                  img: "/insert.png",
                },
                {
                  title: "Easy Scheduling",
                  desc: "Drag & drop makes assigning tasks simple.",
                  img: "/easy.png",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="h-24 w-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md mb-6 p-4">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------
            WHY TASKMATE SECTION
        ------------------------------------------- */}
        <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Why Choose TaskMate?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12 items-center">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                      <Star size={20} />
                    </span>
                    Smart Prioritization
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Our AI analyzes your habits and deadlines to automatically
                    prioritize what matters most. Never miss a deadline again.
                  </p>
                  <div className="rounded-xl overflow-hidden h-64 relative">
                    <img
                      src="/smart.jpg"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      alt="Smart Prioritization"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                      <CheckCircle size={20} />
                    </span>
                    Voice Command
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    "Hey TaskMate, schedule a meeting at 3 PM." Control your
                    entire workflow with simple natural language commands.
                  </p>
                  <div className="rounded-xl overflow-hidden h-64 relative">
                    <img
                      src="/voice.jpg"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      alt="Voice Command"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                      <CheckCircle size={20} />
                    </span>
                    Manage Deadlines
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    "Hey TaskMate, schedule a meeting at 3 PM." Control your
                    entire workflow with simple natural language commands.
                  </p>
                  <div className="rounded-xl overflow-hidden h-64 relative">
                    <img
                      src="/manage.jpg"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      alt="Manage Deadlines"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </section>

        {/* ------------------------------------------
            CTA SECTION
        ------------------------------------------- */}
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="bg-purple-600 rounded-3xl p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Ready to Boost Your Productivity?
                </h2>
                <p className="text-purple-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                  Join thousands of users who are getting more done in less time
                  with TaskMate AI.
                </p>
                <button
                  className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
                  onClick={() => router.push("/auth/register")}
                >
                  Start Your Free Trial
                </button>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
