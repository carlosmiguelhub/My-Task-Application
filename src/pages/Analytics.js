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
import { motion } from "framer-motion";
import { BarChart2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Analytics = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [stats, setStats] = useState({ total: 0, done: 0, progress: 0, pending: 0 });
  const [loading, setLoading] = useState(false);

  // ✅ Load all boards for dropdown
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
        let total = 0, done = 0, progress = 0, pending = 0;

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
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedBoard, user]);

  const percentDone = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 md:p-10 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-semibold flex items-center gap-2 text-indigo-400">
          <BarChart2 size={22} /> Analytics
        </h1>
      </div>

      {/* Board Selector */}
      <div className="max-w-md mb-10">
        <label className="block text-slate-400 text-sm mb-2">
          Select Board
        </label>
        <select
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Choose a board</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Display */}
      {loading ? (
        <div className="flex justify-center items-center mt-10">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : selectedBoard ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl"
        >
          {[
            { label: "Total Tasks", value: stats.total, color: "from-slate-700 to-slate-600" },
            { label: "Completed", value: stats.done, color: "from-green-600 to-green-500" },
            { label: "In Progress", value: stats.progress, color: "from-yellow-600 to-yellow-500" },
            { label: "Pending", value: stats.pending, color: "from-red-600 to-red-500" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className={`rounded-2xl p-6 bg-gradient-to-br ${item.color} text-white text-center shadow-lg`}
            >
              <h3 className="text-lg font-semibold">{item.label}</h3>
              <p className="text-3xl font-bold mt-2">{item.value}</p>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <p className="text-slate-400">Select a board to view analytics.</p>
      )}

      {/* Completion Chart Placeholder */}
      {selectedBoard && !loading && (
        <div className="mt-10 text-center">
          <p className="text-slate-400 mb-2 text-sm">
            Completion Rate
          </p>
          <div className="relative w-64 h-64 mx-auto">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path
                className="text-slate-700"
                stroke="currentColor"
                strokeWidth="3.8"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-500"
                stroke="currentColor"
                strokeWidth="3.8"
                strokeDasharray={`${percentDone}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-400">{percentDone}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
