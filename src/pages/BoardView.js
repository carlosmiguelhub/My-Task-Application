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
import { db, storage } from "../firebase";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useSelector } from "react-redux";

/* ==========================================================
   COUNTDOWN TIMER
   ========================================================== */
const CountdownTimer = ({ dueDate, createdAt, status }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [barColor, setBarColor] = useState("bg-green-500");

  useEffect(() => {
    if (!dueDate || !createdAt) return;
    const startTime = new Date(createdAt);
    const endTime = new Date(dueDate);

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

    const interval = setInterval(() => {
      const now = new Date();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        setIsOverdue(true);
        setTimeLeft("⚠️ Overdue");
        setProgress(100);
        setBarColor("bg-gray-500");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(
        `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`
      );

      const totalDuration = endTime - startTime;
      const elapsed = totalDuration - diff;
      const percent = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100)
      );
      setProgress(percent);

      if (percent > 90) setBarColor("bg-red-500");
      else if (percent > 70) setBarColor("bg-yellow-500");
      else setBarColor("bg-green-500");
    }, 1000);

    return () => clearInterval(interval);
  }, [dueDate, createdAt, status]);

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

/* ==========================================================
   MAIN BOARD VIEW
   ========================================================== */
const BoardView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);

  // files selected for upload in modal
  const [selectedFiles, setSelectedFiles] = useState([]);

  // task form
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "Normal",
    status: "Pending",
    dueDate: new Date(),
    dueTime: "",
    documents: [],
  });

  useEffect(() => {
    if (!user || !id) return;

    const q = query(
      collection(db, "users", user.uid, "boards", id, "tasks"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user, id]);

  /* ==========================================================
     helper: upload files for a task
     ========================================================== */
  const uploadFilesForTask = async (taskId, files) => {
    if (!files || files.length === 0) return [];

    const uploads = await Promise.all(
      files.map(async (file) => {
        const storageRef = ref(
          storage,
          `users/${user.uid}/boards/${id}/tasks/${taskId}/${Date.now()}_${file.name}`
        );
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);

        return {
          name: file.name,
          url,
          path: snap.ref.fullPath,
        };
      })
    );

    return uploads;
  };

  /* ==========================================================
     ADD / EDIT TASK
     ========================================================== */
  const handleSaveTask = async () => {
    if (!newTask.title.trim()) return;
    if (!user || !id) return;

    try {
      const combinedDueDate = new Date(newTask.dueDate);
      if (newTask.dueTime) {
        const [hours, minutes] = newTask.dueTime.split(":");
        combinedDueDate.setHours(hours, minutes, 0, 0);
      }

      if (isEditing && editTaskId) {
        const taskRef = doc(
          db,
          "users",
          user.uid,
          "boards",
          id,
          "tasks",
          editTaskId
        );

        const existingDocs = Array.isArray(newTask.documents)
          ? newTask.documents
          : [];

        const newDocs =
          selectedFiles.length > 0
            ? await uploadFilesForTask(editTaskId, selectedFiles)
            : [];

        const documents = [...existingDocs, ...newDocs];

        await updateDoc(taskRef, {
          title: newTask.title,
          priority: newTask.priority,
          status: newTask.status,
          dueDate: combinedDueDate,
          dueTime: newTask.dueTime,
          documents,
        });

        await createNotification(
          user.uid,
          "Task Updated",
          `You updated "${newTask.title}".`,
          "info"
        );
      } else {
        // create task first, then upload docs using its id
        const baseData = {
          title: newTask.title,
          priority: newTask.priority,
          status: newTask.status,
          dueDate: combinedDueDate,
          dueTime: newTask.dueTime,
          documents: [],
          createdAt: serverTimestamp(),
          startTime: new Date().toISOString(),
          userEmail: user?.email || null, // ✅ store email for reminders
        };

        const docRef = await addDoc(
          collection(db, "users", user.uid, "boards", id, "tasks"),
          baseData
        );

        let documents = [];
        if (selectedFiles.length > 0) {
          documents = await uploadFilesForTask(docRef.id, selectedFiles);
          await updateDoc(docRef, { documents });
        }

        await createNotification(
          user.uid,
          "Task Created",
          `You successfully added "${newTask.title}".`,
          "success"
        );
      }

      // reset modal + form
      setIsModalOpen(false);
      setIsEditing(false);
      setEditTaskId(null);
      setSelectedFiles([]);
      setNewTask({
        title: "",
        priority: "Normal",
        status: "Pending",
        dueDate: new Date(),
        dueTime: "",
        documents: [],
      });
    } catch (err) {
      console.error("Error saving task:", err);
      await createNotification(
        user?.uid,
        "Upload Failed",
        "There was an error uploading documents.",
        "error"
      );
    }
  };

  /* ==========================================================
     OTHER ACTIONS
     ========================================================== */
  const handleDelete = async (taskId) => {
    await deleteDoc(doc(db, "users", user.uid, "boards", id, "tasks", taskId));
    await createNotification(user.uid, "Task Deleted", "Deleted task.", "warn");
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    await updateDoc(doc(db, "users", user.uid, "boards", id, "tasks", taskId), {
      status: newStatus,
    });
    await createNotification(
      user.uid,
      "Task Updated",
      `Task moved to "${newStatus}".`,
      "info"
    );
  };

  const handleArchive = async (taskId) => {
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
    const snap = await getDoc(taskRef);
    await setDoc(archiveRef, { ...snap.data(), archivedAt: new Date() });
    await deleteDoc(taskRef);
    await createNotification(user.uid, "Task Archived", "Task archived.", "info");
  };

  const openEditModal = (task) => {
    const due = task.dueDate?.seconds
      ? new Date(task.dueDate.seconds * 1000)
      : new Date(task.dueDate);

    setNewTask({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: due,
      dueTime: due.toTimeString().slice(0, 5),
      documents: task.documents || [],
    });
    setSelectedFiles([]);
    setEditTaskId(task.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  const priorityColor = {
    High: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-400/30",
    Normal:
      "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
    Low: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/30",
  };

  /* ==========================================================
     UI
     ========================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/archive/${id}`)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm text-white"
          >
            <Archive size={18} /> View Archive
          </button>
          <button
            onClick={() => navigate(`/board/${id}/documents`)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm text-white"
          >
            <FileText size={18} /> View Documents
          </button>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setIsEditing(false);
              setSelectedFiles([]);
              setNewTask({
                title: "",
                priority: "Normal",
                status: "Pending",
                dueDate: new Date(),
                dueTime: "",
                documents: [],
              });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm text-white"
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["Pending", "In Progress", "Done"].map((status) => (
            <motion.div
              key={status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 dark:bg-slate-800/80 border rounded-2xl p-4 shadow-lg"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                {status === "Pending" && <AlertCircle size={18} />}
                {status === "In Progress" && <Calendar size={18} />}
                {status === "Done" && <CheckCircle size={18} />}
                {status}
              </h2>

              <AnimatePresence>
                {getTasksByStatus(status).map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3 bg-slate-100 dark:bg-slate-900/70 border rounded-xl mb-2 group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3
                        className="font-medium text-slate-800 dark:text-white cursor-pointer"
                        onClick={() => openEditModal(task)}
                      >
                        {task.title}
                      </h3>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex justify-between text-xs mb-2">
                      <span
                        className={`px-2 py-0.5 border rounded-full ${priorityColor[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(
                          task.dueDate?.seconds
                            ? task.dueDate.seconds * 1000
                            : task.dueDate
                        ).toLocaleString()}
                      </span>
                    </div>

                    <CountdownTimer
                      dueDate={
                        task.dueDate?.seconds
                          ? new Date(task.dueDate.seconds * 1000)
                          : task.dueDate
                      }
                      createdAt={
                        task.startTime
                          ? new Date(task.startTime)
                          : task.createdAt?.seconds
                          ? new Date(task.createdAt.seconds * 1000)
                          : new Date()
                      }
                      status={task.status}
                    />

                    {/* 📎 Attached documents with Preview */}
                    {task.documents && task.documents.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {task.documents.map((docItem, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-white/70 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/70"
                          >
                            <div className="flex items-center gap-1 overflow-hidden">
                              <FileText size={14} className="text-indigo-500" />
                              <span className="truncate max-w-[140px]">
                                {docItem.name || `Document ${idx + 1}`}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                window.open(docItem.url, "_blank", "noopener")
                              }
                              className="ml-2 px-2 py-0.5 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-[11px]"
                            >
                              Preview
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      {task.status === "Pending" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(task.id, "In Progress")
                          }
                          className="px-3 py-1 bg-yellow-400 text-white rounded-md text-sm hover:bg-yellow-500"
                        >
                          Start
                        </button>
                      )}
                      {task.status === "In Progress" && (
                        <button
                          onClick={() => handleStatusUpdate(task.id, "Done")}
                          className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      )}
                      {task.status === "Done" && (
                        <button
                          onClick={() => handleArchive(task.id)}
                          className="px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 flex items-center gap-1"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 border rounded-2xl p-6 w-[90%] max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
              {isEditing ? "Edit Task" : "Add Task"}
            </h2>

            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-2 mb-3"
            />

            {/* Attach Documents */}
            <div className="mb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Attach Documents
              </label>
              <input
                type="file"
                multiple
                onChange={(e) =>
                  setSelectedFiles(Array.from(e.target.files || []))
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-3 py-2 text-sm"
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedFiles.length} file(s) selected
                </p>
              )}

              {/* Existing docs in edit mode if no new selection */}
              {isEditing &&
                newTask.documents &&
                newTask.documents.length > 0 &&
                selectedFiles.length === 0 && (
                  <div className="mt-2 text-xs">
                    <p className="text-slate-500 mb-1">Existing documents:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {newTask.documents.map((docItem, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() =>
                              window.open(docItem.url, "_blank", "noopener")
                            }
                            className="text-indigo-500 hover:underline"
                          >
                            {docItem.name || `Document ${idx + 1}`}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

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
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-3 py-2"
              >
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="mb-3">
              <label className="block text-sm mb-1">Due Date</label>
              <DatePicker
                selected={newTask.dueDate}
                onChange={(date) => setNewTask({ ...newTask, dueDate: date })}
                dateFormat="MMM d, yyyy"
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-3 py-2"
              />
            </div>

            {/* Due Time */}
            <div className="mb-3">
              <label className="block text-sm mb-1">Due Time</label>
              <input
                type="time"
                value={newTask.dueTime}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueTime: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedFiles([]);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
              >
                {isEditing ? "Save Changes" : "Add Task"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BoardView;
