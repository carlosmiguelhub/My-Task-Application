import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { db, storage, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Settings,
  Activity,
  ArrowLeft,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
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

  // form + settings state
  const [profileForm, setProfileForm] = useState({
    fullname: "",
    phone: "",
  });
  const [prefs, setPrefs] = useState({
    notificationsEnabled: true,
    themePreference: "system", // system | light | dark (for future use)
  });

  const [loading, setLoading] = useState(true); // initial load + reset button spinner
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [editingProfile, setEditingProfile] = useState(false);
  const [toast, setToast] = useState(null);

  // ✅ Load user info from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const base = {
            fullname: data.fullname || "",
            phone: data.phone || "",
            email: user.email,
            photoURL: data.photoURL || "",
          };
          setUserData(base);
          setProfileForm({
            fullname: base.fullname,
            phone: base.phone,
          });
          setPrefs({
            notificationsEnabled:
              typeof data.notificationsEnabled === "boolean"
                ? data.notificationsEnabled
                : true,
            themePreference: data.themePreference || "system",
          });
        } else {
          // fallback if no extra data yet
          const base = {
            fullname: "",
            phone: "",
            email: user.email,
            photoURL: "",
          };
          setUserData(base);
          setProfileForm({
            fullname: "",
            phone: "",
          });
          setPrefs({
            notificationsEnabled: true,
            themePreference: "system",
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
    if (!file || !user) return;

    try {
      const fileRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setUserData((prev) => ({ ...prev, photoURL: url }));

      // also persist in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: url });

      setToast({
        type: "success",
        message: "Profile picture updated successfully.",
      });
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error("Upload failed:", error);
      setToast({
        type: "error",
        message: "Failed to upload picture. Please try again.",
      });
      setTimeout(() => setToast(null), 4000);
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
      setTimeout(() => setToast(null), 4000);
    }
  };

  // ✅ Start editing (from left card button)
  const handleEditInfo = () => {
    setActiveTab("settings");
    setEditingProfile(true);
  };

  // ✅ Save profile + preferences
  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSavingProfile(true);
      const userRef = doc(db, "users", user.uid);

      const payload = {
        fullname: profileForm.fullname.trim(),
        phone: profileForm.phone.trim(),
        photoURL: userData.photoURL || "",
        notificationsEnabled: prefs.notificationsEnabled,
        themePreference: prefs.themePreference,
      };

      await updateDoc(userRef, payload);

      setUserData((prev) => ({
        ...prev,
        fullname: payload.fullname,
        phone: payload.phone,
      }));

      setEditingProfile(false);
      setToast({
        type: "success",
        message: "Profile updated successfully.",
      });
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setToast({
        type: "error",
        message: "Failed to save profile. Please try again.",
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      fullname: userData.fullname || "",
      phone: userData.phone || "",
    });
    setEditingProfile(false);
  };

  if (loading && !userData.email) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white p-6 md:p-10 transition-colors duration-300">
      {/* ✅ Floating Toast */}
      
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 40, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 40, y: -10 }}
            transition={{ duration: 0.35 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-red-500/10 text-red-300 border-red-500/30"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 mr-1" />
          Logged in as{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {userData.email || "User"}
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-8">
        {/* LEFT PROFILE CARD */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-white/80 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.18)] flex flex-col p-6"
        >
          {/* Gradient accent */}
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-sky-400/20 blur-3xl opacity-70" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-40 blur-sm" />
              <img
                src={
                  userData.photoURL ||
                  `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(
                    userData.fullname || userData.email || "User"
                  )}`
                }
                alt="Profile"
                className="relative w-32 h-32 rounded-full object-cover border-[3px] border-indigo-400 shadow-xl"
              />
              <label
                htmlFor="photoUpload"
                className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 p-2 rounded-full text-white cursor-pointer shadow-md flex items-center justify-center transition"
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

            <h2 className="mt-4 text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {userData.fullname || "Unnamed User"}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              {userData.email}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Task Master User
            </div>

            <div className="mt-6 w-full space-y-3 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Full name
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[55%] text-right">
                  {userData.fullname || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Phone
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {userData.phone || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Member Since
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  2025
                </span>
              </div>
            </div>

            <button
              onClick={handleEditInfo}
              className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition shadow-sm"
            >
              Edit Info
            </button>
          </div>
        </motion.div>

        {/* RIGHT PANEL (TABS + CONTENT) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.18)] p-6"
        >
          {/* Tabs */}
          <div className="flex flex-wrap gap-4 mb-6 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
            <button
              onClick={() => setActiveTab("settings")}
              className={`inline-flex items-center gap-2 text-sm font-medium pb-1.5 border-b-2 transition-all ${
                activeTab === "settings"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Settings size={18} />
              Account Settings
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`inline-flex items-center gap-2 text-sm font-medium pb-1.5 border-b-2 transition-all ${
                activeTab === "activity"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Activity size={18} />
              Recent Activity
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
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Account Settings
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your profile and how Task Master works for you.
                  </p>
                </div>

                {/* Profile Details (editable) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Profile details
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Update your name and contact information.
                      </p>
                    </div>
                    {!editingProfile && (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Full name
                      </label>
                      <input
                        type="text"
                        value={profileForm.fullname}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            fullname: e.target.value,
                          }))
                        }
                        disabled={!editingProfile}
                        className={`w-full text-sm rounded-lg px-3 py-2 border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400 ${
                          editingProfile
                            ? "border-slate-300 dark:border-slate-600"
                            : "border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80"
                        }`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        disabled={!editingProfile}
                        className={`w-full text-sm rounded-lg px-3 py-2 border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400 ${
                          editingProfile
                            ? "border-slate-300 dark:border-slate-600"
                            : "border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-80"
                        }`}
                        placeholder="Add a phone number"
                      />
                    </div>
                  </div>

                  {editingProfile ? (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingProfile}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition ${
                          savingProfile ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                      >
                        {savingProfile && (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                            className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full"
                          />
                        )}
                        Save changes
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                      To edit, click “Edit Info” on the left card or{" "}
                      <button
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        className="underline underline-offset-2 text-indigo-600 dark:text-indigo-400"
                      >
                        start editing here
                      </button>
                      .
                    </p>
                  )}
                </div>

                {/* Notification + Theme cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Notifications
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Control email notifications from Task Master.
                    </p>
                    <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-indigo-600 w-4 h-4"
                        checked={prefs.notificationsEnabled}
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            notificationsEnabled: e.target.checked,
                          }))
                        }
                      />
                      Enable email alerts
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Theme preference
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      This is stored with your profile for future use.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {[
                        { id: "system", label: "System" },
                        { id: "light", label: "Light" },
                        { id: "dark", label: "Dark" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setPrefs((prev) => ({
                              ...prev,
                              themePreference: opt.id,
                            }))
                          }
                          className={`px-3 py-1 rounded-full border transition ${
                            prefs.themePreference === opt.id
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 mt-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Security
                  </p>
                  <button
                    onClick={handlePasswordReset}
                    disabled={loading}
                    className={`inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:via-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-medium shadow-sm transition ${
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
                          className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full"
                        />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        <Lock size={14} className="opacity-90" />
                        Send password reset email
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    We’ll send a secure reset link to{" "}
                    <span className="font-medium">{userData.email}</span>.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Recent Activity
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    A quick snapshot of what you’ve been doing in Task Master.
                  </p>
                </div>

                {/* Simple static activity timeline for now */}
                <div className="relative pl-4 border-l border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-indigo-500 shadow-md" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Created a new board:{" "}
                      <span className="text-indigo-500 dark:text-indigo-400">
                        “Work Projects”
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Today • 09:24 AM
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-emerald-500 shadow-md" />
                    <div className="pl-0 space-y-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Completed task:{" "}
                        <span className="text-emerald-500">
                          “Fix navbar bug”
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Yesterday • 4:13 PM
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-sky-500 shadow-md" />
                    <div className="pl-0 space-y-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Updated weekly planner with a new event.
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        2 days ago • 10:02 AM
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-400 shadow-md" />
                    <div className="pl-0 space-y-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Logged in from a new device.
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        3 days ago • 8:41 PM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
    
  );
};

export default Profile;
