import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { ArrowLeft, Trash2, RotateCcw } from "lucide-react";

const ArchiveView = () => {
  const { id } = useParams(); // boardId
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Real-time load of archived tasks
  useEffect(() => {
    if (!user || !id) return;

    const archiveRef = collection(db, "users", user.uid, "boards", id, "archive");

    const unsubscribe = onSnapshot(archiveRef, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setArchivedTasks(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, id]);

  // ✅ Restore task back to active board
  const restoreTask = async (task) => {
    try {
      const taskRef = doc(db, "users", user.uid, "boards", id, "tasks", task.id);
      await setDoc(taskRef, { ...task, status: "Pending", restoredAt: new Date() });
      await deleteDoc(doc(db, "users", user.uid, "boards", id, "archive", task.id));
      setArchivedTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (error) {
      console.error("Error restoring task:", error);
    }
  };

  // ✅ Permanently delete from archive
  const deleteFromArchive = async (taskId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "boards", id, "archive", taskId));
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting archived task:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-800 dark:text-white p-6 md:p-10">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        {/* Back to Board */}
        <button
          onClick={() => navigate(`/board/${id}`)}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Board
        </button>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
          Archived Tasks
        </h1>
      </div>

      {/* ===== Archived Tasks ===== */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : archivedTasks.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          No archived tasks yet.
        </p>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {archivedTasks.map((task) => (
            <motion.div
              key={task.id}
              whileHover={{ scale: 1.03 }}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-md flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg mb-2 text-indigo-600 dark:text-indigo-400">
                  {task.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Archived on:{" "}
                  {task.archivedAt
                    ? new Date(task.archivedAt.seconds * 1000).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => restoreTask(task)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition"
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button
                  onClick={() => deleteFromArchive(task.id)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ArchiveView;
