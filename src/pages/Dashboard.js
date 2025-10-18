import React, { useState, useEffect } from "react";
import BoardCard from "../components/BoardCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Calendar,
  Activity,
  FileText,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCircle,
  Clock,
  FolderKanban,
  TrendingUp,
  PlusCircle,
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

  // ✅ Responsive sidebar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Load boards
  useEffect(() => {
    if (!user) return;
    const boardsRef = collection(db, "users", user.uid, "boards");
    const q = query(boardsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const boardList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBoards(boardList);
      setLoadingBoards(false);
    });
    return () => unsubscribe();
  }, [user]);

  // ✅ Load tasks (for Home summary + recent tasks)
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
          let tasks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  // ✅ Add new board
  const handleAddBoard = async () => {
    if (!newBoardName.trim() || !user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "boards"), {
        title: newBoardName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewBoardName("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding board:", error);
      console.log("🔥 Logged in UID:", user?.uid);
    }
  };

  // ✅ Delete board
  const handleDeleteBoard = async (boardId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "boards", boardId));
    } catch (error) {
      console.error("Error deleting board:", error);
    }
  };

  // ✅ Sidebar menu
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
      {/* ===== ✅ Mobile Sidebar Drawer ===== */}
<AnimatePresence>
  {isMobileOpen && (
    <>
      {/* Background overlay (click to close) */}
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsMobileOpen(false)}
      ></motion.div>

      {/* Sidebar drawer */}
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

        {/* Mobile Nav Menu (same as desktop menuItems) */}
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
        {/* ===== Mobile Header ===== */}
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

        {/* ===== Conditional Pages ===== */}
        {activePage === "home" ? (
          <>
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-8">
              Welcome back,{" "}
              <span className="text-indigo-600">
                {user?.displayName || "User"} 👋
              </span>
            </h1>

            {/* ✅ Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white shadow-md rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <h2 className="text-xl font-bold text-gray-800">
                    {taskStats.total}
                  </h2>
                </div>
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <div className="bg-white shadow-md rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <h2 className="text-xl font-bold text-gray-800">
                    {taskStats.progress}
                  </h2>
                </div>
                <Clock className="text-yellow-500 w-8 h-8" />
              </div>
              <div className="bg-white shadow-md rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <h2 className="text-xl font-bold text-gray-800">
                    {taskStats.pending}
                  </h2>
                </div>
                <FolderKanban className="text-indigo-500 w-8 h-8" />
              </div>
              <div className="bg-white shadow-md rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <h2 className="text-xl font-bold text-gray-800">
                    {taskStats.done}
                  </h2>
                </div>
                <TrendingUp className="text-blue-500 w-8 h-8" />
              </div>
            </div>

            {/* ===== Recent Tasks ===== */}
{/* ===== Upcoming Plans (Dynamic & Informative) ===== */}
<div className="bg-white dark:bg-slate-900 shadow-md rounded-2xl p-6 mb-8 transition-colors">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
      Upcoming Plans
    </h2>
    <button
      onClick={() => navigate("/planner")}
      className="text-sm px-4 py-2 rounded-md bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-700 transition font-medium"
    >
      View Planner →
    </button>
  </div>

  <ul className="relative border-l border-slate-200 dark:border-slate-700 pl-6 space-y-6">
    {[
      {
        id: 1,
        title: "Team Meeting",
        date: "2025-10-21T10:00:00",
        description: "Discuss sprint goals with the development team.",
        tag: "Meeting",
        location: "Zoom",
        createdAt: "2025-10-16T09:00:00",
      },
      {
        id: 2,
        title: "UI Review Session",
        date: "2025-10-22T14:30:00",
        description: "Finalize dashboard UI changes before next release.",
        tag: "Design",
        location: "Office HQ",
        createdAt: "2025-10-16T10:00:00",
      },
      {
        id: 3,
        title: "Client Presentation",
        date: "2025-10-25T09:00:00",
        description: "Showcase project progress to the marketing client.",
        tag: "Client",
        location: "Online Call",
        createdAt: "2025-10-16T11:00:00",
      },
    ].map((plan, index) => {
      const now = new Date();
      const start = new Date(plan.date);
      const created = new Date(plan.createdAt);

      const diff = start - now;
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const totalDays = 7;
      const progress = Math.min(100, Math.max(0, ((7 - daysLeft) / 7) * 100));

      let color = "bg-green-500";
      if (daysLeft <= 1) color = "bg-red-500";
      else if (daysLeft <= 3) color = "bg-yellow-500";

      const countdownLabel =
        diff <= 0
          ? "Happening now"
          : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`;

      const createdLabel = created.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const formattedDate = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <motion.li
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md border border-transparent hover:border-indigo-100 dark:hover:border-slate-700 transition-all duration-300 cursor-pointer"
          title={`${plan.description}\n${formattedDate} at ${formattedTime} • ${plan.location}`}
        >
          {/* Timeline Dot */}
          <span className="absolute -left-[11px] top-5 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 ring-4 ring-white dark:ring-slate-900 group-hover:scale-110 transition-transform"></span>

          {/* Top Row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base mb-1 sm:mb-0 flex items-center gap-2">
              {plan.title}
              {/* Tag */}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  plan.tag === "Meeting"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : plan.tag === "Design"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                    : plan.tag === "Client"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300"
                }`}
              >
                {plan.tag}
              </span>
            </h3>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {formattedDate} • {formattedTime}
            </span>
          </div>

          {/* Location */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            📍 {plan.location}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
            {plan.description}
          </p>

          {/* Countdown + Created date */}
          <div className="mt-3 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {countdownLabel}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Created {createdLabel}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </motion.li>
      );
    })}
  </ul>
</div>
    


            {/* ===== Quick Actions ===== */}
            <div className="flex flex-wrap gap-4">
              {/* <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                <PlusCircle size={20} /> New Task
                
              </button> */}
              <button
                onClick={() => navigate('/summary')}
                className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                <FolderKanban size={20} /> View Task Summary
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ===== Boards Section ===== */}
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-8">
              Your Boards
            </h1>
            {loadingBoards ? (
              <div className="flex justify-center items-center mt-20">
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
              <span className="text-lg font-medium">
                + Create New Board
              </span>
            </div>
          </>
        )}

        {/* ===== Create Board Modal ===== */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-80 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Create New Board
              </h2>

              <input
                type="text"
                placeholder="Enter board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2 mb-4 bg-transparent text-gray-800 dark:text-gray-100"
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
