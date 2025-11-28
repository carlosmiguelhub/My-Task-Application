import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FileText, FolderKanban, Link2 } from "lucide-react";

import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const BoardDocuments = () => {
  const { id } = useParams(); // board id
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const q = query(
      collection(db, "users", user.uid, "boards", id, "tasks"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading documents:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, id]);

  const tasksWithDocs = tasks.filter(
    (t) => Array.isArray(t.documents) && t.documents.length > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <button
          onClick={() => navigate(`/board/${id}`)}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          <ArrowLeft size={18} /> Back to Board
        </button>

        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <FileText size={20} />
          <span className="font-semibold text-lg">Board Documents</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tasksWithDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 dark:text-slate-400">
          <FileText size={36} className="mb-3 opacity-70" />
          <p className="text-lg font-semibold mb-1">No documents yet</p>
          <p className="text-sm max-w-md">
            Attach documents to tasks from the board view, and they will appear
            here grouped by task.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {tasksWithDocs.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-md"
              >
                {/* Task header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="text-indigo-500" size={18} />
                    <h2 className="font-semibold text-slate-800 dark:text-white">
                      {task.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-600/70 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
                      {task.status || "Pending"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-600/70 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
                      Priority: {task.priority || "Normal"}
                    </span>
                  </div>
                </div>

                {/* Documents list */}
                <div className="flex flex-wrap gap-2">
                  {task.documents.map((docItem, index) => (
                    <a
                      key={index}
                      href={docItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                    >
                      <FileText size={16} />
                      <span className="truncate max-w-[160px] sm:max-w-[240px]">
                        {docItem.name || `Document ${index + 1}`}
                      </span>
                      <Link2 size={14} className="opacity-70" />
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default BoardDocuments;
