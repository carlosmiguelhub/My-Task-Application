// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBADwbL_dUfTgroZFOBFvhLqJbEem3xQOk",
  authDomain: "taskmaster-app-642b7.firebaseapp.com",
  projectId: "taskmaster-app-642b7",
  storageBucket: "taskmaster-app-642b7.appspot.com", // 🔹 FIXED HERE
  messagingSenderId: "874779590659",
  appId: "1:874779590659:web:12f793dd47d88070ff0e36",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { messaging, onMessage };
export default app;
