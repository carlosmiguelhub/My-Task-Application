import React, { useState } from "react";
import { useSelector } from "react-redux";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { createNotification } from "../utils/notificationUtils";

const DocumentUpload = ({ boardId, tasks }) => {
  const { user } = useSelector((state) => state.auth);
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !boardId) return;
    setUploading(true);

    try {
      // 1️⃣ Upload file to Storage
      const fileRef = ref(storage, `documents/${user.uid}/${boardId}/${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on("state_changed", null, console.error, async () => {
        const fileURL = await getDownloadURL(uploadTask.snapshot.ref);

        // 2️⃣ Get selected task name (optional)
        const selectedTask = tasks.find((t) => t.id === taskId);

        // 3️⃣ Save metadata in Firestore
        await addDoc(collection(db, "users", user.uid, "boards", boardId, "documents"), {
          fileName: file.name,
          fileURL,
          fileType: file.type,
          taskId: taskId || null,
          taskName: selectedTask ? selectedTask.title : null,
          uploadedBy: user.uid,
          uploadedAt: serverTimestamp(),
          description,
        });

        // 4️⃣ Send notification
        await createNotification(
          user.uid,
          "Document Uploaded",
          `You uploaded "${file.name}"${selectedTask ? ` for "${selectedTask.title}"` : ""}.`,
          "success"
        );

        setFile(null);
        setTaskId("");
        setDescription("");
        setUploading(false);
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-slate-800 shadow">
      <h3 className="text-lg font-semibold mb-3 text-indigo-600 dark:text-indigo-400">
        Upload Document
      </h3>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="block w-full mb-3 text-sm text-slate-700 dark:text-slate-300"
      />

      {/* Task Selector */}
      <select
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
        className="w-full mb-3 border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900"
      >
        <option value="">-- Select Task (optional) --</option>
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a short note or description..."
        className="w-full mb-3 border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900"
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default DocumentUpload;
