import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Plus,
  ArrowLeft,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { useSelector } from "react-redux";

const BoardView = () => {
  const { id } = useParams(); // boardId
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "Normal",
    status: "Pending",
    dueDate: new Date(),
  });
  const [loading, setLoading] = useState(true);

  // ✅ Load all tasks for this board
  useEffect(() => {
    if (!user || !id) return;

    const tasksRef = collection(db, "users", user.uid, "boards", id, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, id]);

  // ✅ Add task
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "boards", id, "tasks"), {
        ...newTask,
        createdAt: serverTimestamp(),
      });
      setNewTask({
        title: "",
        priority: "Normal",
        status: "Pending",
        dueDate: new Date(),
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  // ✅ Delete task
  const handleDelete = async (taskId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "boards", id, "tasks", taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // ✅ Cycle task status
  const handleStatusChange = async (task) => {
    const nextStatus =
      task.status === "Pending"
        ? "In Progress"
        : task.status === "In Progress"
        ? "Done"
        : "Pending";

    try {
      await updateDoc(doc(db, "users", user.uid, "boards", id, "tasks", task.id), {
        status: nextStatus,
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // ✅ Filter tasks by column
  const getTasksByStatus = (status) =>
    tasks.filter((task) => task.status === status);

  // ✅ Priority color tag
  const priorityColor = {
    High: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-400/30",
    Normal: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
    Low: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/30",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium text-white transition"
        >
          <Plus size={18} /> Add Task
        </button>
      </div>

      {/* Kanban Columns */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["Pending", "In Progress", "Done"].map((status) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg transition"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                {status === "Pending" && <AlertCircle size={18} />}
                {status === "In Progress" && <Calendar size={18} />}
                {status === "Done" && <CheckCircle size={18} />}
                {status}
              </h2>

              {getTasksByStatus(status).length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No tasks here.
                </p>
              ) : (
                <div className="space-y-3">
                  {getTasksByStatus(status).map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group"
                      onClick={() => handleStatusChange(task)}
                      title="Click to change status"
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-slate-800 dark:text-white">
                          {task.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span
                          className={`px-2 py-0.5 border rounded-full ${priorityColor[task.priority]}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {task.dueDate
                            ? new Date(task.dueDate.seconds * 1000).toLocaleDateString()
                            : "No date"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== Add Task Modal ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl transition"
          >
            <h2 className="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
              Add Task
            </h2>

            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />

            {/* Priority */}
            <div className="mb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </div>

            {/* Status */}
            <div className="mb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="mb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Due Date
              </label>
              <DatePicker
                selected={newTask.dueDate}
                onChange={(date) => setNewTask({ ...newTask, dueDate: date })}
                dateFormat="MMM d, yyyy"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 rounded-lg text-white transition"
              >
                Add Task
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BoardView;
