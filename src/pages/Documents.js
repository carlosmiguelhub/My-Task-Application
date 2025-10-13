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
import { FileText, Upload, X, Download, Loader2 } from "lucide-react";

const Documents = () => {
  const { user } = useSelector((state) => state.auth);

  const [documents, setDocuments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState("");
  const [description, setDescription] = useState("");

  // ✅ Load user's documents
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "documents"),
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
  }, [user]);

  // ✅ Load user's planner tasks for dropdown
  useEffect(() => {
    if (!user) return;

    const fetchPlans = async () => {
      const plansSnapshot = await getDocs(
        collection(db, "users", user.uid, "plans")
      );
      const data = plansSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlans(data);
    };

    fetchPlans();
  }, [user]);

  // ✅ Handle document upload
  const handleUpload = async () => {
    if (!file || !selectedTask || !user) return;
    setUploading(true);

    const task = plans.find((p) => p.id === selectedTask);
    const storageRef = ref(storage, `users/${user.uid}/documents/${file.name}`);
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
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "users", user.uid, "documents"), {
          fileName: file.name,
          fileURL: downloadURL,
          taskId: task.id,
          taskTitle: task.title,
          description,
          uploadedAt: serverTimestamp(),
        });

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300 p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText size={22} className="text-indigo-500" /> Documents
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {/* Document List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 max-w-4xl">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          Uploaded Documents
        </h2>

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
                      <>• {new Date(doc.uploadedAt.seconds * 1000).toLocaleString()}</>
                    )}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {doc.description}
                    </p>
                  )}
                </div>
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
          <p className="text-slate-500 dark:text-slate-400">
            No documents uploaded yet.
          </p>
        )}
      </div>

      {/* Upload Modal */}
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

              {/* File input */}
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mb-4 w-full text-sm text-slate-700 dark:text-slate-200"
              />

              {/* Task Dropdown */}
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2"
              >
                <option value="">Select Task</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title}
                  </option>
                ))}
              </select>

              {/* Description */}
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 resize-none mb-4"
              ></textarea>

              {/* Upload progress */}
              {uploading && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {/* Buttons */}
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
