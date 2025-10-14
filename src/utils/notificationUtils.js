import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ✅ Generic function to create a new notification
export const createNotification = async (uid, title, message, type = "info") => {
  if (!uid) return;
  try {
    await addDoc(collection(db, "users", uid, "notifications"), {
      title,
      message,
      type, // success | warning | info | error
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};
