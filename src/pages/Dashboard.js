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

  // ✅ Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Load boards from Firestore (real-time)
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

  // ✅ Add a new board
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

  // ✅ Delete a board
  const handleDeleteBoard = async (boardId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "boards", boardId));
    } catch (error) {
      console.error("Error deleting board:", error);
    }
  };

  // ✅ Sidebar Menu
  const menuItems = [
    { name: "Home", icon: <Home size={20} />, path: "/dashboard" },
    { name: "Boards", icon: <LayoutGrid size={20} />, path: "/dashboard" },
    { name: "Planner", icon: <Calendar size={20} />, path: "/planner" },
    { name: "Analytics", icon: <Activity size={20} />, path: "/analytics" }, // ✅ Added
  ];

  return (
    <div className="flex min-h-screen font-poppins bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* ===== Sidebar (Desktop + Tablet) ===== */}
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
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                className="relative flex items-center gap-3 p-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="font-medium transition-opacity duration-200">
                    {item.name}
                  </span>
                )}
                {isCollapsed && hoveredItem === index && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-[90%] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-3 py-1 rounded-md shadow-lg whitespace-nowrap"
                  >
                    {item.name}
                  </motion.div>
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

      {/* ===== Mobile Drawer Sidebar ===== */}
      <AnimatePresence>
        {isMobileOpen && (
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
                    navigate(item.path);
                    setIsMobileOpen(false);
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
              ))}
            </nav>
          </motion.div>
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

        {/* Add new board card */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="mt-8 flex items-center justify-center border-2 border-dashed border-indigo-400 dark:border-indigo-600 rounded-2xl p-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-all max-w-6xl mx-auto"
        >
          <span className="text-lg font-medium">+ Create New Board</span>
        </div>

        {/* ===== Modal ===== */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-[90%] max-w-md p-6 border border-slate-200 dark:border-slate-700"
              >
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                  Create New Board
                </h2>

                <input
                  type="text"
                  placeholder="Enter board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 outline-none transition"
                />

                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBoard}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition"
                  >
                    Add Board
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Dashboard;
