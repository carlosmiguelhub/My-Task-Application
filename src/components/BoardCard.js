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
    const tasksRef = collection(db, "users", user.uid, "boards", boardId, "tasks");
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
      className="relative overflow-hidden p-6 rounded-2xl shadow-md bg-slate-800/70 border border-slate-700 text-white hover:shadow-indigo-500/30 hover:border-indigo-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[150px]"
    >
      {/* Ripple Effect */}
      <motion.span
        className="absolute bg-indigo-400/30 rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0 }}
        animate={controls}
        style={{
          width: 100,
          height: 100,
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div>
        <h2 className="text-xl font-semibold text-indigo-400">{title}</h2>
        <p className="text-slate-400 text-sm mt-2">Board overview</p>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} />
          <span>
            {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
          </span>
        </div>
        <span className="text-indigo-400 hover:text-indigo-300 transition">
          View →
        </span>
      </div>
    </motion.div>
  );
};

export default BoardCard;
