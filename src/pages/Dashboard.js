import React, { useState, useEffect } from "react";
import BoardCard from "../components/BoardCard";
import { motion, AnimatePresence } from "framer-motion";
import AiCoachChat from "../components/AiCoachChat";
import {
  Home,
  LayoutGrid,
  Calendar,
  Activity,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCircle,
  Clock,
  FolderKanban,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

/* ==========================================================
   PLAN COUNTDOWN (Dashboard)
   Syncs with planner by using createdAt → end
   ========================================================== */
const formatDiff = (ms) => {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((abs / (1000 * 60)) % 60);
  const seconds = Math.floor((abs / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const PlanCountdown = ({ createdAt, end }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!end) return;

    const endDate = end instanceof Date ? end : new Date(end);
    const createdDate = createdAt
      ? createdAt instanceof Date
        ? createdAt
        : new Date(createdAt)
      : null;

    const tick = () => {
      const now = Date.now();
      const endMs = endDate.getTime();
      const remaining = endMs - now;

      if (remaining <= 0) {
        setTimeLeft(`Expired (${formatDiff(remaining)} ago)`);
      } else {
        setTimeLeft(formatDiff(remaining));
      }

      if (createdDate) {
        const durMs = endMs - createdDate.getTime();
        setDuration(formatDiff(durMs));
      } else {
        setDuration("");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, end]);

  if (!end) return null;

  return (
    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
      <div>
        <span className="font-semibold">Duration:</span>{" "}
        {duration || "—"}
      </div>
      <div>
        <span className="font-semibold">Time left:</span>{" "}
        {timeLeft}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [recentTasks, setRecentTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    done: 0,
    progress: 0,
    pending: 0,
  });

  // ✅ Upcoming planner events
  const [plans, setPlans] = useState([]);
  // 👉 index for the next-plan carousel
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // ✅ Guide overlay
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const guideSteps = [
    {
      title: "Welcome to Task Master",
      body: "This dashboard gives you a quick overview of your work: tasks, boards, and upcoming plans.",
      tip: "Start with Boards to organize different projects or areas of your life.",
    },
    {
      title: "Boards",
      body: "Boards let you group related tasks together (e.g., Work, Personal, School).",
      tip: "Go to the Boards page and click 'Create New Board' to make your first board.",
      actionLabel: "Go to Boards",
      action: () => setActivePage("boards"),
    },
    {
      title: "Tasks inside Boards",
      body: "Each board contains tasks that you can move between statuses like Pending, In Progress, and Done.",
      tip: "Open a board and use the add task button to start filling it with work items.",
    },
    {
      title: "Planner & Plans",
      body: "The Planner is your calendar-style view where you can schedule plans, events, and deadlines.",
      tip: "Use it for time-bound items like meetings, exams, or due dates.",
      actionLabel: "Open Planner",
      action: () => navigate("/planner"),
    },
    {
      title: "Next Plan & Countdown",
      body: "This card shows your nearest upcoming plan and a live countdown until it happens.",
      tip: "Create plans in the Planner to see them appear here and keep track of important dates.",
    },
    {
      title: "Analytics & Progress",
      body: "Analytics helps you see how many tasks are done, in progress, or pending.",
      tip: "Use this to understand your productivity and where you’re getting stuck.",
      actionLabel: "View Analytics",
      action: () => navigate("/analytics"),
    },
    {
      title: "You’re ready to go!",
      body: "Use Boards to organize, Tasks to execute, Planner to schedule, and Analytics to track progress.",
      tip: "You can reopen this guide anytime using the Guide button.",
    },
  ];

  const handleGuideNext = () => {
    setGuideStep((prev) => Math.min(prev + 1, guideSteps.length - 1));
  };

  const handleGuidePrev = () => {
    setGuideStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGuideClose = () => {
    setIsGuideOpen(false);
    setGuideStep(0);
  };

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load boards
  useEffect(() => {
    if (!user) return;
    const boardsRef = collection(db, "users", user.uid, "boards");
    const qBoards = query(boardsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(qBoards, (snapshot) => {
      const boardList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setBoards(boardList);
      setLoadingBoards(false);
    });
    return () => unsubscribe();
  }, [user]);

  // This is for the AI CHAT
   

  // Load tasks
  useEffect(() => {
    if (!user) return;
    const unsubscribeList = [];

    const fetchAllTasks = async () => {
      let allTasks = [];
      const boardsRef = collection(db, "users", user.uid, "boards");
      const boardSnap = await getDocs(boardsRef);

      boardSnap.forEach((boardDoc) => {
        const tasksRef = collection(
          db,
          "users",
          user.uid,
          "boards",
          boardDoc.id,
          "tasks"
        );
        const unsub = onSnapshot(tasksRef, (snap) => {
          let tasks = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          allTasks = allTasks.filter((t) => t.boardId !== boardDoc.id);
          tasks = tasks.map((t) => ({ ...t, boardId: boardDoc.id }));
          allTasks.push(...tasks);

          const total = allTasks.length;
          const done = allTasks.filter((t) => t.status === "Done").length;
          const progress = allTasks.filter(
            (t) => t.status === "In Progress"
          ).length;
          const pending = allTasks.filter(
            (t) => !t.status || t.status === "Pending"
          ).length;

          setTaskStats({ total, done, progress, pending });

          const sorted = [...allTasks].sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );
          setRecentTasks(sorted.slice(0, 5));
        });
        unsubscribeList.push(unsub);
      });
    };

    fetchAllTasks();
    return () => unsubscribeList.forEach((u) => u());
  }, [user]);

  // ✅ Load upcoming planner events (ignore completed plans)
  useEffect(() => {
    if (!user) return;

    const qPlans = query(
      collection(db, "users", user.uid, "plannerEvents"),
      orderBy("start", "asc")
    );

    const unsubscribe = onSnapshot(
      qPlans,
      (snapshot) => {
        if (snapshot.empty) {
          setPlans([]);
          setCurrentPlanIndex(0);
          return;
        }

        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const start =
            d.start?.toDate?.() ??
            (typeof d.start === "string" ? new Date(d.start) : null);
          const end =
            d.end?.toDate?.() ??
            (typeof d.end === "string" ? new Date(d.end) : null);

          return {
            id: docSnap.id,
            title: d.title || "Untitled Plan",
            description: d.description || "",
            tag: d.agenda || "General",
            location: d.where || "No location",
            priority: d.priority || "medium",
            start,
            end,
            createdAt:
              d.createdAt?.toDate?.() ??
              (typeof d.createdAt === "string"
                ? new Date(d.createdAt)
                : new Date()),
            completed: !!d.completed,
            completedAt:
              d.completedAt?.toDate?.() ??
              (d.completedAt ? new Date(d.completedAt) : null),
          };
        });

        const now = new Date();
        const upcoming = data.filter(
          (p) =>
            !p.completed && // ❌ skip completed plans
            p.start instanceof Date &&
            !isNaN(p.start) &&
            p.start.getTime() >= now.getTime() - 1000 * 60 * 60 * 24
        );

        // keep them ordered, but we really only care about the first ones
        setPlans(upcoming.slice(0, 5));
        setCurrentPlanIndex(0); // 🔄 reset to first whenever list changes
      },
      (err) => {
        console.error("❌ Firestore listener error:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 🔁 Current plan for the mini carousel
  const hasPlans = plans.length > 0;
  const currentPlan =
    hasPlans && currentPlanIndex < plans.length
      ? plans[currentPlanIndex]
      : null;

  const getPlanMeta = (plan) => {
    if (!plan || !(plan.start instanceof Date) || isNaN(plan.start)) return null;

    const formattedDate = plan.start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = plan.start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const now = new Date();
    const diffMs = plan.start.getTime() - now.getTime();
    let startsLabel;

    if (diffMs <= 0) {
      startsLabel = "Happening now";
    } else {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

      if (days > 0) {
        startsLabel = `In ${days}d ${hours}h`;
      } else if (hours > 0) {
        startsLabel = `In ${hours}h ${minutes}m`;
      } else {
        startsLabel = `In ${minutes}m`;
      }
    }

    return { formattedDate, formattedTime, startsLabel };
  };

  const currentPlanMeta = getPlanMeta(currentPlan);

  // 🔼 Carousel controls
  const handlePrevPlan = () => {
    setCurrentPlanIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextPlan = () => {
    setCurrentPlanIndex((prev) =>
      Math.min(plans.length - 1, prev + 1)
    );
  };

  // Add / Delete boards
  const handleAddBoard = async () => {
    if (!newBoardName.trim() || !user) return;
    await addDoc(collection(db, "users", user.uid, "boards"), {
      title: newBoardName.trim(),
      createdAt: serverTimestamp(),
    });
    setNewBoardName("");
    setIsModalOpen(false);
  };

  const handleDeleteBoard = async (boardId) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "boards", boardId));
  };

  const menuItems = [
    { name: "Home", icon: <Home size={20} />, action: () => setActivePage("home") },
    { name: "Boards", icon: <LayoutGrid size={20} />, action: () => setActivePage("boards") },
    { name: "Planner", icon: <Calendar size={20} />, path: "/planner" },
    { name: "Analytics", icon: <Activity size={20} />, path: "/analytics" },
  ];

  return (
    <div className="flex min-h-screen font-poppins bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* ===== Sidebar ===== */}
      <motion.div
        animate={{ width: isCollapsed ? "80px" : "220px" }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col fixed top-0 left-0 z-30"
      >
        <div className="p-4 flex flex-col h-full relative">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-6 transition-all">
              Task Master
            </h1>
          )}

          <nav className="space-y-2 flex-1 relative">
            {menuItems.map((item, index) => (
              <div
                key={item.name}
                onClick={() => {
                  if (item.action) item.action();
                  if (item.path) navigate(item.path);
                }}
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`relative flex items-center gap-3 p-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition group ${
                  activePage === item.name.toLowerCase()
                    ? "bg-indigo-100 dark:bg-slate-800"
                    : ""
                }`}
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="font-medium transition-opacity duration-200">
                    {item.name}
                  </span>
                )}
              </div>
            ))}
          </nav>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 transition-all duration-300 hidden md:flex"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </motion.div>

      {/* ===== Mobile Sidebar ===== */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
            ></motion.div>

            <motion.div
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="fixed inset-y-0 left-0 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 p-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  Task Master
                </h1>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={20} className="text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => {
                      if (item.action) item.action();
                      if (item.path) navigate(item.path);
                      setIsMobileOpen(false);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                      activePage === item.name.toLowerCase()
                        ? "bg-indigo-100 dark:bg-slate-800"
                        : ""
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Main Content ===== */}
      <motion.div
        animate={{
          marginLeft: isMobile ? "0px" : isCollapsed ? "80px" : "220px",
        }}
        transition={{ duration: 0.3 }}
        className="flex-1 p-6 md:p-10 transition-all duration-300"
      >
        {/* Mobile Header */}
        <div className="flex md:hidden justify-between items-center mb-6">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Task Master
          </h1>
        </div>

        {/* ===== Home Page ===== */}
        {activePage === "home" ? (
          <>
            {/* Header + Guide Button */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
                Welcome back,{" "}
                <span className="text-indigo-600">
                  {user?.displayName || "User"} 👋
                </span>
              </h1>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <HelpCircle size={18} className="text-indigo-500" />
                <span>Guide</span>
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-5 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Total Tasks
                  </p>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {taskStats.total}
                  </h2>
                </div>
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-5 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    In Progress
                  </p>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {taskStats.progress}
                  </h2>
                </div>
                <Clock className="text-yellow-500 w-8 h-8" />
              </div>
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-5 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pending
                  </p>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {taskStats.pending}
                  </h2>
                </div>
                <FolderKanban className="text-indigo-500 w-8 h-8" />
              </div>
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-5 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Completed
                  </p>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {taskStats.done}
                  </h2>
                </div>
                <TrendingUp className="text-blue-500 w-8 h-8" />
              </div>
            </div>

            {/* 🔹 Quick Actions ABOVE Next Plan */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={() => navigate("/summary")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl 
                           bg-slate-200 hover:bg-slate-300 text-slate-800
                           dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100
                           transition font-medium"
              >
                <FolderKanban size={20} /> View Your Tasks
              </button>

              <button
                onClick={() => navigate("/planner-summary")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl 
                           bg-slate-200 hover:bg-slate-300 text-slate-800
                           dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100
                           transition font-medium"
              >
                <Calendar size={20} /> View Your Plans
              </button>
            </div>
            

            {/* ⭐ Next Plan Carousel Card */}
            <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Next Plan
                  </h2>

                  {/* 🔁 Plan carousel controls */}
                  {hasPlans && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <button
                        onClick={handlePrevPlan}
                        disabled={currentPlanIndex === 0}
                        className={`p-1 rounded-full border border-slate-300 dark:border-slate-600 
                                    hover:bg-slate-100 dark:hover:bg-slate-800 transition 
                                    disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="font-medium">
                        {currentPlanIndex + 1} / {plans.length}
                      </span>
                      <button
                        onClick={handleNextPlan}
                        disabled={currentPlanIndex === plans.length - 1}
                        className={`p-1 rounded-full border border-slate-300 dark:border-slate-600 
                                    hover:bg-slate-100 dark:hover:bg-slate-800 transition 
                                    disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>


                <button
                  onClick={() => navigate("/planner")}
                  className="text-sm px-4 py-2 rounded-md bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-800 transition font-medium"
                >
                  View Planner →
                </button>
              </div>

              {!currentPlan || !currentPlanMeta ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No upcoming plans found. Create one in your{" "}
                  <span
                    onClick={() => navigate("/planner")}
                    className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                  >
                    Planner
                  </span>
                  .
                </p>
              ) : (
                <div className="max-w-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            currentPlan.priority === "high"
                              ? "#ef4444"
                              : currentPlan.priority === "low"
                              ? "#10b981"
                              : "#f59e0b",
                        }}
                      ></span>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {currentPlan.title}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {currentPlan.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      📍 {currentPlan.location}
                    </p>
                    {currentPlan.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {currentPlan.description}
                      </p>
                    )}

                    



                    {/* ⏳ Duration + Time Left (synced with planner) */}
                    <PlanCountdown
                      createdAt={currentPlan.createdAt}
                      end={currentPlan.end}
                    />
                  </div>

                  <div className="text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <p className="font-medium text-slate-700 dark:text-slate-100">
                      {currentPlanMeta.formattedDate}
                    </p>
                    <p>{currentPlanMeta.formattedTime}</p>
                    <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-300 font-semibold">
                      {currentPlanMeta.startsLabel}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
            


        ) : (
          /* ===== Boards Page ===== */
          <div className="bg-white dark:bg-slate-900 shadow-md rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
              Your Boards
            </h1>

            {loadingBoards ? (
              <div className="flex justify-center items-center mt-10">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : boards.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center mt-10">
                No boards yet. Create one below 👇
              </p>
            ) : (
              <motion.div
                className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl mx-auto"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {boards.map((board) => (
                  <motion.div
                    key={board.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative group cursor-pointer"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <BoardCard title={board.title} boardId={board.id} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1 rounded-full transition"
                      title="Delete Board"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Add Board */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="mt-8 flex items-center justify-center border-2 border-dashed border-indigo-400 dark:border-indigo-600 rounded-2xl p-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-all max-w-6xl mx-auto"
            >
              <span className="text-lg font-medium">+ Create New Board</span>
            </div>
          </div>
        )}

        {/* ===== Modal (Create Board) ===== */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-80 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Create New Board
              </h2>
              <input
                type="text"
                placeholder="Enter board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 mb-4 bg-transparent text-slate-800 dark:text-slate-100"
              />
              <button
                onClick={handleAddBoard}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* ===== Guide Overlay ===== */}
        {isGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md relative border border-slate-200 dark:border-slate-700">
              <button
                onClick={handleGuideClose}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>

              <div className="mb-4 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Quick Guide
              </div>

              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {guideSteps[guideStep].title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                {guideSteps[guideStep].body}
              </p>
              {guideSteps[guideStep].tip && (
                <div className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg px-3 py-2 mb-4 border border-indigo-100 dark:border-indigo-900/60">
                  💡 {guideSteps[guideStep].tip}
                </div>
              )}

              {guideSteps[guideStep].action && (
                <button
                  onClick={() => {
                    guideSteps[guideStep].action();
                    setIsGuideOpen(false);
                    setGuideStep(0);
                  }}
                  className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                >
                  {guideSteps[guideStep].actionLabel} →
                </button>
              )}
              

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Step {guideStep + 1} of {guideSteps.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGuidePrev}
                    disabled={guideStep === 0}
                    className="text-xs px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  {guideStep === guideSteps.length - 1 ? (
                    <button
                      onClick={handleGuideClose}
                      className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Finish
                    </button>
                  ) : (
                    <button
                      onClick={handleGuideNext}
                      className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Next
                    </button>

                    
                  )}
                  
                </div>
              </div>
            </div>
          </div>
          
        )}
      </motion.div>
      <div className="relative min-h-screen">
      {/* existing layout */}
      <AiCoachChat />
    </div>
    </div>
    
  );
};

export default Dashboard;
