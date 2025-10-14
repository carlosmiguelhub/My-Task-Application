import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { db, storage, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Settings, Activity, ArrowLeft, Lock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    fullname: "",
    phone: "",
    email: "",
    photoURL: "",
  });
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // ✅ floating toast

  // ✅ Load user info
  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserData({
            ...docSnap.data(),
            email: user.email,
            photoURL: docSnap.data().photoURL || "",
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  // ✅ Upload new photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);

    try {
      const fileRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setUserData((prev) => ({ ...prev, photoURL: url }));
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // ✅ Send password reset email
  const handlePasswordReset = async () => {
    if (!user || !user.email) return;

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, user.email);
      setToast({
        type: "success",
        message: `Password reset email sent to ${user.email}.`,
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      setToast({
        type: "error",
        message: "Failed to send reset email. Please try again.",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 4000); // hide after 4s
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10 transition-colors duration-300">
      {/* ✅ Floating Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50, y: -20 }}
            transition={{ duration: 0.4 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      {/* Layout */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT PROFILE CARD */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center"
        >
          <div className="relative w-32 h-32">
            <img
              src={
                userData.photoURL ||
                `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(
                  userData.fullname || "User"
                )}`
              }
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500 shadow-md"
            />
            <label
              htmlFor="photoUpload"
              className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-700 p-2 rounded-full text-white cursor-pointer shadow-lg"
            >
              <Camera size={16} />
              <input
                type="file"
                id="photoUpload"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <h2 className="text-xl font-bold mt-4">{userData.fullname}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {userData.email}
          </p>

          <div className="mt-6 space-y-2 w-full text-left">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <strong>Phone:</strong> {userData.phone || "N/A"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <strong>Member Since:</strong> 2025
            </p>
          </div>

          <button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Edit Info
          </button>
        </motion.div>

        {/* RIGHT FEATURE PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-6"
        >
          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 font-medium transition ${
                activeTab === "settings"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Settings size={18} /> Account Settings
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 font-medium transition ${
                activeTab === "activity"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Activity size={18} /> Recent Activity
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <h3 className="text-lg font-semibold">Account Settings</h3>
                <div className="flex flex-col gap-4">
                  <label className="text-sm text-slate-500 dark:text-slate-400">
                    Notifications:{" "}
                    <input type="checkbox" className="ml-2 accent-indigo-600" />{" "}
                    Enable Email Alerts
                  </label>
                  <label className="text-sm text-slate-500 dark:text-slate-400">
                    Theme: <span className="ml-2">Auto (System)</span>
                  </label>

                  {/* ✅ Change Password Button */}
                  <button
                    onClick={handlePasswordReset}
                    disabled={loading}
                    className={`mt-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-fit transition ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        ></motion.span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Lock size={14} className="opacity-80" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <li>✅ Created Board: “Work Projects”</li>
                  <li>📌 Added Task: “Finalize UI Mockups”</li>
                  <li>⚡ Completed Task: “Fix Navbar Bug”</li>
                  <li>🕒 Last Login: 2 hours ago</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
