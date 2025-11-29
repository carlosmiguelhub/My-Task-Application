import React, { useState, useEffect } from "react";
import BoardCard from "../components/BoardCard";
import { motion, AnimatePresence } from "framer-motion";
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

  // ✅ Load upcoming planner events
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
          };
        });

        const now = new Date();
        const upcoming = data.filter(
          (p) =>
            p.start instanceof Date &&
            !isNaN(p.start) &&
            p.start.getTime() >= now.getTime() - 1000 * 60 * 60 * 24
        );

        // keep them ordered, but we really only care about the first one
        setPlans(upcoming.slice(0, 5));
      },
      (err) => {
        console.error("❌ Firestore listener error:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Compute next upcoming plan (for minimal card)
  const nextPlan = plans.length > 0 ? plans[0] : null;
  let nextPlanMeta = null;

  if (nextPlan && nextPlan.start instanceof Date && !isNaN(nextPlan.start)) {
    const formattedDate = nextPlan.start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = nextPlan.start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const now = new Date();
    const diffMs = nextPlan.start.getTime() - now.getTime();
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

    nextPlanMeta = { formattedDate, formattedTime, startsLabel };
  }

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
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-8">
              Welcome back,{" "}
              <span className="text-indigo-600">
                {user?.displayName || "User"} 👋
              </span>
            </h1>

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

            {/* ⭐ Minimal Next Plan Card */}
            <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  Next Plan
                </h2>
                <button
                  onClick={() => navigate("/planner")}
                  className="text-sm px-4 py-2 rounded-md bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-800 transition font-medium"
                >
                  View Planner →
                </button>
              </div>

              {!nextPlan || !nextPlanMeta ? (
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
                            nextPlan.priority === "high"
                              ? "#ef4444"
                              : nextPlan.priority === "low"
                              ? "#10b981"
                              : "#f59e0b",
                        }}
                      ></span>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {nextPlan.title}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {nextPlan.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      📍 {nextPlan.location}
                    </p>
                    {nextPlan.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {nextPlan.description}
                      </p>
                    )}

                    {/* ⏳ Duration + Time Left (synced with planner) */}
                    <PlanCountdown
                      createdAt={nextPlan.createdAt}
                      end={nextPlan.end}
                    />
                  </div>

                  <div className="text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <p className="font-medium text-slate-700 dark:text-slate-100">
                      {nextPlanMeta.formattedDate}
                    </p>
                    <p>{nextPlanMeta.formattedTime}</p>
                    <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-300 font-semibold">
                      {nextPlanMeta.startsLabel}
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
      </motion.div>
    </div>
  );
};

export default Dashboard;
