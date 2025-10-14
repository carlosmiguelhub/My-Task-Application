import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, storage } from "../firebase";
import { useSelector } from "react-redux";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  FileText,
  Upload,
  X,
  Download,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const Documents = () => {
   const { id } = useParams(); // boardId
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { id: boardId } = useParams(); // ✅ Get board ID from URL (/board/:id/documents)

  // 🔹 State
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState("");
  const [description, setDescription] = useState("");

  // ✅ Load uploaded documents (now from this specific board)
  useEffect(() => {
    if (!user || !boardId) return;

    // 🔸 load docs from: users/{uid}/boards/{boardId}/documents
    const q = query(
      collection(db, "users", user.uid, "boards", boardId, "documents"),
      orderBy("uploadedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(data);
    });

    return () => unsubscribe();
  }, [user, boardId]);

  // ✅ Load tasks for this board (so user can select which task to attach file to)
  useEffect(() => {
    if (!user || !boardId) return;

    const fetchTasks = async () => {
      try {
        // 🔸 load tasks from: users/{uid}/boards/{boardId}/tasks
        const tasksSnapshot = await getDocs(
          collection(db, "users", user.uid, "boards", boardId, "tasks")
        );
        const data = tasksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTasks(data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    fetchTasks();
  }, [user, boardId]);

  // ✅ Handle document upload
  const handleUpload = async () => {
    if (!file || !selectedTask || !user || !boardId) return;
    setUploading(true);

    const task = tasks.find((t) => t.id === selectedTask);
    // 🔸 Save file in storage path organized by board
    const storageRef = ref(
      storage,
      `users/${user.uid}/boards/${boardId}/documents/${file.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        setUploading(false);
      },
      async () => {
        // 🔸 Once upload is done, save metadata in Firestore under this board
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(
          collection(db, "users", user.uid, "boards", boardId, "documents"),
          {
            fileName: file.name,
            fileURL: downloadURL,
            taskId: task.id,
            taskTitle: task.title,
            description,
            uploadedAt: serverTimestamp(),
          }
        );

        // ✅ Reset all form states
        setFile(null);
        setSelectedTask("");
        setDescription("");
        setUploadProgress(0);
        setUploading(false);
        setIsModalOpen(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 md:p-10">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          {/* ✅ Go back button */}
          <button
            onClick={() => navigate(`/board/${id}`)}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>

          {/* Page Title */}
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText size={22} className="text-indigo-500" /> Documents
          </h1>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {/* ===== Documents List ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 max-w-4xl">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          Uploaded Documents
        </h2>

        {/* 🔹 Show uploaded docs */}
        {documents.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 px-3 rounded-md transition"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {doc.fileName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    For: {doc.taskTitle || "—"}{" "}
                    {doc.uploadedAt?.seconds && (
                      <>
                        •{" "}
                        {new Date(
                          doc.uploadedAt.seconds * 1000
                        ).toLocaleString()}
                      </>
                    )}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* 🔹 Download link */}
                <a
                  href={doc.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Download size={16} /> Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          // 🔹 Empty state message
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            No documents uploaded yet. Click “Upload Document” to add your first file.
          </p>
        )}
      </div>

      {/* ===== Upload Modal ===== */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-[90%] max-w-md p-6 border border-slate-200 dark:border-slate-700"
            >
              {/* 🔹 Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Upload Document
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                  <X size={18} className="text-slate-500 dark:text-slate-300" />
                </button>
              </div>

              {/* 🔹 File input */}
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mb-4 w-full text-sm text-slate-700 dark:text-slate-200"
              />

              {/* 🔹 Task selector */}
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2"
              >
                <option value="">Select Task</option>
                {/* ✅ Now shows actual tasks from this board */}
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>

              {/* 🔹 Description */}
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 resize-none mb-4"
              ></textarea>

              {/* 🔹 Upload progress bar */}
              {uploading && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {/* 🔹 Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Documents;
