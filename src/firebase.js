// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase config
const firebaseConfig = {
 apiKey: "AIzaSyBADwbL_dUfTgroZFOBFvhLqJbEem3xQOk",
  authDomain: "taskmaster-app-642b7.firebaseapp.com",
  projectId: "taskmaster-app-642b7",
  storageBucket: "taskmaster-app-642b7.firebasestorage.app",
  messagingSenderId: "874779590659",
  appId: "1:874779590659:web:12f793dd47d88070ff0e36",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
