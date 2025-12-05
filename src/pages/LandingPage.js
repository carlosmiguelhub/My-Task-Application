import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Bell,
  LayoutDashboard,
  Sparkles,
  Shield,
  Mail,
  ArrowRight,
  SunMedium,
  MoonStar,
} from "lucide-react";

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const staggerParent = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const fadeItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);

  const goLogin = () => navigate("/login");
  const goDashboard = () => navigate("/dashboard");

 // Replace these three lines in your component:

const bgClass = darkMode
  ? "bg-[#070312] text-slate-100"
  : "bg-gradient-to-b from-[#f5ecff] via-white to-[#f5ecff] text-slate-900";

const cardBg = darkMode
  ? "bg-white/5 border-white/10"
  : "bg-white/95 border-purple-100 shadow-[0_18px_40px_rgba(15,23,42,0.12)]";

const glassBg = darkMode
  ? "bg-white/5 border-white/15"
  : "bg-white/80 border-purple-100 shadow-[0_24px_60px_rgba(148,27,181,0.18)]";


  const subTextColor = darkMode ? "text-slate-300" : "text-slate-600";

  return (
    <div
      className={`relative min-h-screen flex flex-col ${bgClass} overflow-hidden transition-colors duration-500`}
    >
      {/* Floating gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-purple-500/25 blur-[110px]"
          animate={{ y: [0, 20, 0], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-56 right-0 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/20 blur-[130px]"
          animate={{ y: [0, -25, 0], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-10 w-40 h-40 rounded-full bg-purple-300/20 blur-[70px]"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* NAVBAR */}
      <header
        className={`relative backdrop-blur-xl border-b ${
          darkMode
            ? "bg-black/30 border-purple-500/25"
            : "bg-white/90 border-slate-200/80 shadow-sm"
        }`}
      >
        <div className="max-w-6xl lg:max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-400 via-fuchsia-500 to-purple-700 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/50">
              TM
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-sm">Task Master</span>
              <p className="text-[10px] text-purple-400/90">
                smart task planner
              </p>
            </div>
          </motion.div>

          {/* Right side: theme toggle + buttons */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className={`relative w-12 h-6 rounded-full flex items-center px-1 transition-colors border ${
                darkMode
                  ? "bg-purple-900/70 border-purple-500/60"
                  : "bg-slate-200 border-slate-300"
              }`}
            >
              <motion.div
                className="w-4 h-4 rounded-full bg-white shadow-md"
                animate={{ x: darkMode ? 0 : 22 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              />
              <span className="absolute left-1 text-[9px]">
                <MoonStar
                  className={`w-3 h-3 ${
                    darkMode ? "text-purple-200" : "text-slate-500"
                  }`}
                />
              </span>
              <span className="absolute right-1 text-[9px]">
                <SunMedium
                  className={`w-3 h-3 ${
                    darkMode ? "text-yellow-300" : "text-yellow-400"
                  }`}
                />
              </span>
            </button>

            <button
              onClick={goLogin}
              className={`text-xs md:text-sm px-3 py-1.5 rounded-full border flex items-center gap-1 transition ${
                darkMode
                  ? "border-purple-400/40 hover:border-purple-300/70 hover:bg-purple-900/30"
                  : "border-slate-300 hover:border-purple-400 hover:bg-purple-50"
              }`}
            >
              <Mail className="w-3 h-3" />
              Log in
            </button>

            <button
              onClick={goLogin}
              className="text-xs md:text-sm px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 text-white font-medium hover:brightness-110 transition shadow-lg shadow-purple-500/40 flex items-center gap-1"
            >
              Get Started
              <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative flex-1">
        {/* HERO */}
        <section className="border-b border-purple-500/10">
          <div className="max-w-6xl lg:max-w-7xl mx-auto px-4 lg:px-6 py-16 md:py-20 lg:py-24 grid gap-16 lg:grid-cols-2 items-center">
            {/* LEFT: text */}
            <motion.div
              variants={staggerParent}
              initial="hidden"
              animate="show"
              className="space-y-5"
            >
              <motion.div
                variants={fadeItem}
                className={`inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border ${
                  darkMode
                    ? "bg-purple-400/10 text-purple-200 border-purple-400/30"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                New: Smart email reminders
              </motion.div>

              {/* Gradient animated title */}
              <motion.h1
                variants={fadeItem}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
              >
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-200 animate-pulse [animation-duration:4s]">
                  Stay ahead of every task.
                </span>
                <span className={darkMode ? "text-slate-100" : "text-slate-900"}>
                  {" "}
                  Let Task Master remember the rest.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeItem}
                className={`mt-1 text-sm md:text-base max-w-xl ${subTextColor}`}
              >
                A modern workspace where you can manage boards, track progress,
                and get automatic email reminders for upcoming deadlines.
                Minimal, fast, and built just for you.
              </motion.p>

              <motion.div
                variants={fadeItem}
                className="flex gap-3 mt-4 flex-wrap"
              >
                <button
                  onClick={goLogin}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 text-white text-sm font-medium hover:brightness-110 transition flex items-center gap-2 shadow-purple-500/40 shadow-lg"
                >
                  Start now <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={goDashboard}
                  className={`px-5 py-2.5 rounded-full text-sm flex items-center gap-2 transition ${
                    darkMode
                      ? "border border-purple-400/40 hover:bg-purple-900/40"
                      : "border border-slate-300 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  View dashboard
                  <LayoutDashboard className="w-4 h-4" />
                </button>
              </motion.div>

              <motion.div
                variants={fadeItem}
                className={`mt-3 flex flex-wrap gap-4 text-[11px] ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  Built with Firebase &amp; SendGrid
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Your data stays yours
                </div>
              </motion.div>
            </motion.div>

            {/* RIGHT: glassmorphism “app preview” */}
            <motion.div variants={container} initial="hidden" animate="show">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`relative rounded-3xl ${glassBg} p-6 md:p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl`}
              >
                {/* floating decorative shapes */}
                <motion.div
                  className="absolute -top-4 -right-4 w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-400 opacity-90"
                  animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -bottom-6 left-6 w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-fuchsia-400 opacity-80"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Top bar */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-medium">
                      Task Master — Project Board
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-400/90">
                    <Bell className="w-3.5 h-3.5" />
                    Live reminders on
                  </div>
                </div>

                {/* Columns */}
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <p className="font-semibold mb-1 text-purple-300">
                      To Do
                    </p>
                    <div
                      className={`rounded-xl ${cardBg} p-2 border border-purple-500/40`}
                    >
                      <p className="font-medium text-sm">
                        Design landing page
                      </p>
                      <p
                        className={`flex items-center gap-1 text-[10px] ${
                          darkMode
                            ? "text-purple-200/80"
                            : "text-purple-600/90"
                        }`}
                      >
                        <Clock className="w-3 h-3" /> Due today · 4:00 PM
                      </p>
                    </div>
                    <div
                      className={`rounded-xl ${cardBg} p-2 mt-2 border border-purple-500/20`}
                    >
                      <p className="font-medium text-sm">
                        Configure email alerts
                      </p>
                      <p
                        className={`text-[10px] ${
                          darkMode
                            ? "text-purple-200/80"
                            : "text-purple-600/90"
                        }`}
                      >
                        Reminder scheduled
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold mb-1 text-purple-300">
                      In Progress
                    </p>
                    <div
                      className={`rounded-xl ${cardBg} p-2 border border-fuchsia-400/40`}
                    >
                      <p className="font-medium text-sm">
                        Clean up task board
                      </p>
                      <p
                        className={`text-[10px] ${
                          darkMode
                            ? "text-purple-100/80"
                            : "text-purple-700/90"
                        }`}
                      >
                        3 subtasks remaining
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold mb-1 text-purple-300">
                      Done
                    </p>
                    <div
                      className={`rounded-xl ${cardBg} p-2 border border-emerald-400/50`}
                    >
                      <p className="font-medium text-sm">Google login</p>
                      <p
                        className={`text-[10px] ${
                          darkMode
                            ? "text-emerald-200/90"
                            : "text-emerald-600"
                        }`}
                      >
                        Completed
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-4 text-[11px] flex items-center justify-between ${
                    darkMode ? "text-slate-300/80" : "text-slate-600/90"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Auto-reminders before deadlines
                  </div>
                  <span>Focus on work, not remembering.</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FEATURES (glass cards) */}
        <section className="border-b border-purple-500/10">
          <div className="max-w-6xl lg:max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-14">
            <motion.h2
              className={`text-xl font-semibold mb-6 ${
                darkMode ? "text-purple-200" : "text-purple-700"
              }`}
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              Built for your workflow
            </motion.h2>

            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid gap-6 md:grid-cols-3 text-sm"
            >
              <motion.div
                variants={fadeItem}
                className={`rounded-xl p-4 md:p-5 backdrop-blur-xl ${glassBg} hover:border-purple-400/60 transition`}
              >
                <p
                  className={`font-medium mb-2 flex items-center gap-2 ${
                    darkMode ? "text-purple-100" : "text-purple-700"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Clean &amp; focused UI
                </p>
                <p className={subTextColor}>
                  Boards, lists, and tasks organized in a simple,
                  distraction-free layout.
                </p>
              </motion.div>

              <motion.div
                variants={fadeItem}
                className={`rounded-xl p-4 md:p-5 backdrop-blur-xl ${glassBg} hover:border-purple-400/60 transition`}
              >
                <p
                  className={`font-medium mb-2 flex items-center gap-2 ${
                    darkMode ? "text-purple-100" : "text-purple-700"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Smart notifications
                </p>
                <p className={subTextColor}>
                  Automatic email alerts before due dates keep your priorities
                  clear.
                </p>
              </motion.div>

              <motion.div
                variants={fadeItem}
                className={`rounded-xl p-4 md:p-5 backdrop-blur-xl ${glassBg} hover:border-purple-400/60 transition`}
              >
                <p
                  className={`font-medium mb-2 flex items-center gap-2 ${
                    darkMode ? "text-purple-100" : "text-purple-700"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Secure foundation
                </p>
                <p className={subTextColor}>
                  Backed by Firebase Auth and Firestore for secure, scalable
                  data.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-12 lg:py-14">
          <div className="max-w-6xl lg:max-w-7xl mx-auto px-4 lg:px-6">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className={`rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl ${
                darkMode
                  ? "bg-gradient-to-r from-purple-600/25 via-fuchsia-500/20 to-purple-500/20 border border-purple-400/40"
                  : "bg-gradient-to-r from-purple-100 via-fuchsia-100 to-purple-50 border border-purple-200"
              }`}
            >
              <div className="space-y-1">
                <p
                  className={`text-lg font-semibold ${
                    darkMode ? "text-purple-100" : "text-purple-900"
                  }`}
                >
                  Ready to level up your task management?
                </p>
                <p
                  className={`text-sm ${
                    darkMode ? "text-purple-100/80" : "text-purple-900/80"
                  }`}
                >
                  Log in, create your first board, and let Task Master handle
                  the reminders.
                </p>
              </div>

              <button
                onClick={goLogin}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 text-white text-sm font-medium hover:brightness-110 transition flex items-center gap-2 shadow-purple-500/40 shadow-lg"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        className={`border-t py-4 text-center text-[11px] ${
          darkMode
            ? "border-purple-500/25 text-purple-200/70"
            : "border-slate-200 text-slate-500"
        }`}
      >
        © {new Date().getFullYear()} Task Master — Built by Carlos
      </footer>
    </div>
  );
};

export default LandingPage;
