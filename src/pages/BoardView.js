import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createNotification } from "../utils/notificationUtils";
import {
  Plus,
  ArrowLeft,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Archive,
  FileText,
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
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useSelector } from "react-redux";


/* ==========================================================
   ✅ FIXED COUNTDOWN TIMER — now stops when status = "Done"
   ========================================================== */
const CountdownTimer = ({ dueDate, status }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [barColor, setBarColor] = useState("bg-green-500");

  useEffect(() => {
    if (!dueDate) return;

    const startTime = new Date();
    const endTime = new Date(dueDate);

    // ✅ If task is already done when rendering
    if (status === "Done") {
      const completedBeforeDeadline = new Date() < endTime;
      setIsOverdue(!completedBeforeDeadline);
      setTimeLeft(
        completedBeforeDeadline ? "✅ Completed on time" : "❌ Completed late"
      );
      setProgress(100);
      setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
      return;
    }

    // 🔧 Live ticking timer
    const interval = setInterval(() => {
      const now = new Date();
      const diff = endTime - now;

      // ✅ Stop if status changes to Done while running
      if (status === "Done") {
        clearInterval(interval);
        const completedBeforeDeadline = now < endTime;
        setIsOverdue(!completedBeforeDeadline);
        setTimeLeft(
          completedBeforeDeadline ? "✅ Completed on time" : "❌ Completed late"
        );
        setProgress(100);
        setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
        return;
      }

      // ⚠️ Handle overdue
      if (diff <= 0) {
        clearInterval(interval);
        setIsOverdue(true);
        setTimeLeft("⚠️ Overdue");
        setProgress(100);
        setBarColor("bg-gray-500");
        return;
      }

      // ⏱ Format remaining time
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`
      );

      // 📊 Progress %
      const totalDuration = endTime - startTime;
      const elapsed = totalDuration - diff;
      const percent = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100)
      );
      setProgress(percent);

      // 🎨 Color based on urgency
      if (percent > 90) setBarColor("bg-red-500");
      else if (percent > 70) setBarColor("bg-yellow-500");
      else setBarColor("bg-green-500");
    }, 1000);

    return () => clearInterval(interval);
  }, [dueDate, status]); // ✅ Re-run whenever status changes

  return (
    <div className="mt-1">
      <p
        className={`text-xs mb-1 ${
          isOverdue ? "text-red-500 font-semibold" : "text-green-600"
        }`}
      >
        {timeLeft}
      </p>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-2 ${barColor} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};



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

  // ✅ Load all tasks from Firestore in real-time
  useEffect(() => {
    if (!user || !id) return;
    const q = query(
      collection(db, "users", user.uid, "boards", id, "tasks"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, id]);

  // ✅ Add task (with Firestore and notification)
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await addDoc(collection(db, "users", user.uid, "boards", id, "tasks"), {
        ...newTask,
        createdAt: serverTimestamp(),
      });

      await createNotification(
        user.uid,
        "Task Created",
        `You successfully added "${newTask.title}".`,
        "success"
      );

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

  // ✅ Delete a task
  const handleDelete = async (taskId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "boards", id, "tasks", taskId));
      await createNotification(
        user.uid,
        "Task Deleted",
        "You deleted a task successfully.",
        "warning"
      );
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // ✅ Update task status (Pending → In Progress → Done)
  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", user.uid, "boards", id, "tasks", taskId), {
        status: newStatus,
      });

      await createNotification(
        user.uid,
        "Task Updated",
        `A task was moved to "${newStatus}".`,
        "info"
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // ✅ Archive completed tasks
  const handleArchive = async (taskId) => {
    try {
      const taskRef = doc(db, "users", user.uid, "boards", id, "tasks", taskId);
      const archiveRef = doc(
        db,
        "users",
        user.uid,
        "boards",
        id,
        "archive",
        taskId
      );

      const snapshot = await getDoc(taskRef);
      const taskData = snapshot.data();

      await setDoc(archiveRef, { ...taskData, archivedAt: new Date() });
      await deleteDoc(taskRef);

      await createNotification(
        user.uid,
        "Task Archived",
        "You archived a completed task.",
        "info"
      );
    } catch (err) {
      console.error("Error archiving task:", err);
    }
  };

  // ✅ Filter tasks by status
  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  // ✅ Color system for priority badges
  const priorityColor = {
    High: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-400/30",
    Normal:
      "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
    Low: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/30",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate(`/archive/${id}`)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition"
          >
            <Archive size={18} /> View Archive
          </button>

          <button
            onClick={() => navigate(`/board/${id}/documents`)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-medium text-white transition"
          >
            <FileText size={18} /> View Documents
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium text-white transition"
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      {/* ===== Kanban Columns ===== */}
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
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg"
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
                <AnimatePresence>
                  {getTasksByStatus(status).map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-slate-800 dark:text-white">
                          {task.title}
                        </h3>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Task meta */}
                      <div className="flex justify-between items-center mb-2 text-xs">
                        <span
                          className={`px-2 py-0.5 border rounded-full ${priorityColor[task.priority]}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {task.dueDate?.seconds
                            ? new Date(task.dueDate.seconds * 1000).toLocaleDateString()
                            : new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* ✅ Countdown Timer (now pauses when Done) */}
                      <CountdownTimer
                        dueDate={
                          task.dueDate?.seconds
                            ? new Date(task.dueDate.seconds * 1000)
                            : task.dueDate
                        }
                        status={task.status}
                      />

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {task.status === "Pending" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(task.id, "In Progress")
                            }
                            className="px-3 py-1 bg-yellow-400 text-white rounded-md text-sm hover:bg-yellow-500 transition"
                          >
                            Start
                          </button>
                        )}

                        {task.status === "In Progress" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(task.id, "Done")
                            }
                            className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Complete
                          </button>
                        )}

                        {task.status === "Done" && (
                          <button
                            onClick={() => handleArchive(task.id)}
                            className="px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition flex items-center gap-1"
                          >
                            <Archive size={14} /> Archive
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl"
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
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </div>

            {/* Due Date Picker */}
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
