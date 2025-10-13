import React, { useState, useEffect } from "react";
import BoardCard from "../components/BoardCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Calendar,
  Activity,
  FileText, // ✅ added for Documents
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
  limit,
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
    { name: "Documents", icon: <FileText size={20} />, path: "/documents" }, // ✅ NEW Sidebar Item
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
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>
      </motion.div>

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
            <div className="bg-white shadow-md rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Recent Tasks
              </h2>
              {recentTasks.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentTasks.map((task) => (
                    <li
                      key={task.id}
                      className="py-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {task.status || "Pending"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "No due date"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No recent tasks yet.</p>
              )}
            </div>

            {/* ===== Quick Actions ===== */}
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                <PlusCircle size={20} /> New Task
              </button>
              <button
                onClick={() => setActivePage("boards")}
                className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                <FolderKanban size={20} /> View Boards
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
      </motion.div>
    </div>
  );
};

export default Dashboard;
