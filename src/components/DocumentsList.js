import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Download, FileText, Image, File } from "lucide-react";

const fileIcon = (type) => {
  if (type.startsWith("image")) return <Image size={20} />;
  if (type.includes("pdf")) return <FileText size={20} />;
  return <File size={20} />;
};

const DocumentsList = ({ boardId }) => {
  const { user } = useSelector((state) => state.auth);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user || !boardId) return;
    const q = query(
      collection(db, "users", user.uid, "boards", boardId, "documents"),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDocs(files);
    });
    return unsub;
  }, [user, boardId]);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="p-4 border rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 mb-2">
            {fileIcon(doc.fileType)}
            <a
              href={doc.fileURL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {doc.fileName}
            </a>
          </div>

          {doc.taskName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              📌 Linked to: {doc.taskName}
            </p>
          )}

          {doc.description && (
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              {doc.description}
            </p>
          )}

          <a
            href={doc.fileURL}
            download
            className="flex items-center gap-1 text-sm text-indigo-500 hover:underline"
          >
            <Download size={14} /> Download
          </a>
        </div>
      ))}
    </div>
  );
};

export default DocumentsList;
