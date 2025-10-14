import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const Analytics = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    done: 0,
    progress: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(false);

  // ✅ Load all boards
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "boards"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBoards(list);
    });
    return () => unsubscribe();
  }, [user]);

  // ✅ Fetch tasks for selected board
  useEffect(() => {
    if (!selectedBoard || !user) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const tasksRef = collection(db, "users", user.uid, "boards", selectedBoard, "tasks");
        const querySnap = await getDocs(tasksRef);
        let total = 0,
          done = 0,
          progress = 0,
          pending = 0;

        querySnap.forEach((doc) => {
          const data = doc.data();
          total++;
          if (data.status === "Done") done++;
          else if (data.status === "In Progress") progress++;
          else pending++;
        });

        setStats({ total, done, progress, pending });
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setLoading(false), 400); // adds a short smooth delay
      }
    };
    fetchStats();
  }, [selectedBoard, user]);

  const percentDone = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const chartData = [
    { name: "Completed", value: stats.done },
    { name: "In Progress", value: stats.progress },
    { name: "Pending", value: stats.pending },
  ];

  const COLORS = ["#4f46e5", "#facc15", "#ef4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-800 dark:text-white p-6 md:p-10 transition-colors duration-500">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-semibold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <BarChart2 size={22} /> Analytics
        </h1>
      </div>

      {/* ===== Board Selector ===== */}
      <div className="max-w-md mb-10">
        <label className="block text-slate-600 dark:text-slate-400 text-sm mb-2">
          Select Board
        </label>
        <select
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        >
          <option value="">Choose a board</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {/* ===== Main Dashboard Layout ===== */}
      {loading ? (
        <div className="flex justify-center items-center mt-10">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : selectedBoard ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedBoard} // triggers animation on board change
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row gap-10 items-start justify-center max-w-7xl mx-auto"
          >
            {/* ===== Left Side: Stat Cards ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-6 flex-shrink-0 w-full lg:w-1/2">
              {[
                {
                  label: "Total Tasks",
                  value: stats.total,
                  color:
                    "from-indigo-100 to-indigo-200 dark:from-slate-700 dark:to-slate-600",
                },
                {
                  label: "Completed",
                  value: stats.done,
                  color:
                    "from-green-200 to-green-300 dark:from-green-600 dark:to-green-500",
                },
                {
                  label: "In Progress",
                  value: stats.progress,
                  color:
                    "from-yellow-200 to-yellow-300 dark:from-yellow-600 dark:to-yellow-500",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  color:
                    "from-red-200 to-red-300 dark:from-red-600 dark:to-red-500",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className={`rounded-2xl p-6 bg-gradient-to-br ${item.color} text-center shadow-md h-[150px] flex flex-col justify-center`}
                >
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {item.label}
                  </h3>
                  <p className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* ===== Right Side: Charts ===== */}
            <div className="flex flex-col gap-8 w-full lg:w-1/2">
              {/* ✅ Pie Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl bg-white dark:bg-slate-900 shadow-md p-6 h-[300px] flex flex-col justify-center"
              >
                <h2 className="text-lg font-semibold mb-4 text-center text-indigo-600 dark:text-indigo-400">
                  Task Distribution
                </h2>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              {/* ✅ Bar Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl bg-white dark:bg-slate-900 shadow-md p-6 h-[300px] flex flex-col justify-center"
              >
                <h2 className="text-lg font-semibold mb-4 text-center text-indigo-600 dark:text-indigo-400">
                  Task Comparison
                </h2>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* ✅ Completion Summary */}
              <div className="text-center mt-4">
                <p className="text-slate-400 text-sm mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {percentDone}%
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="text-slate-500 dark:text-slate-400 text-center">
          Select a board to view analytics.
        </p>
      )}
    </div>
  );
};

export default Analytics;
