import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import { collection, onSnapshot } from "firebase/firestore";
import { ClipboardList } from "lucide-react";

const BoardCard = ({ title, boardId }) => {
  const { user } = useSelector((state) => state.auth);
  const [taskCount, setTaskCount] = useState(0);
  const controls = useAnimation();

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

  // ✅ Ripple animation
  const handleClick = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    controls.start({
      opacity: [0.5, 0],
      scale: [0, 4],
      x,
      y,
      transition: { duration: 0.6, ease: "easeOut" },
    });
  };

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="
        relative overflow-hidden p-6 rounded-2xl shadow-md
        bg-white text-slate-800 border border-slate-200
        dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700
        hover:shadow-indigo-500/20 hover:border-indigo-400/60
        transition-all duration-300 cursor-pointer
        flex flex-col justify-between min-h-[150px]
      "
    >
      {/* Ripple Effect */}
      <motion.span
        className="absolute bg-indigo-400/25 rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0 }}
        animate={controls}
        style={{
          width: 120,
          height: 120,
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div>
        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
          {title || "Untitled Board"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          Board overview
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <ClipboardList size={16} />
          <span>
            {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
          </span>
        </div>
        <span className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition">
          View →
        </span>
      </div>
    </motion.div>
  );
};

export default BoardCard;
