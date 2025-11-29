import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import { collection, onSnapshot } from "firebase/firestore";
import { ClipboardList } from "lucide-react";

const BoardCard = ({ title, boardId }) => {
  const { user } = useSelector((state) => state.auth);
  const [taskCount, setTaskCount] = useState(0);

  // ✅ Fetch task count in real time
  useEffect(() => {
    if (!user || !boardId) return;

    const tasksRef = collection(
      db,
      "users",
      user.uid,
      "boards",
      boardId,
      "tasks"
    );

    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      setTaskCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user, boardId]);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="
        cursor-pointer relative
        rounded-xl border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800
        shadow-sm hover:shadow-md
        p-4 flex flex-col gap-2
        transition-all duration-200
      "
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 truncate">
          {title || "Untitled Board"}
        </h2>
        <span className="text-[11px] text-indigo-500 dark:text-indigo-300 opacity-0 group-hover:opacity-100 md:opacity-100 transition">
          View →
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Board overview
      </p>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} />
          <span>
            {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default BoardCard;
