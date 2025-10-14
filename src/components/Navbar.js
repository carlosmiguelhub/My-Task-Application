import React, { useEffect, useState, useRef } from "react";
import { Moon, Sun, User, LogOut, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { clearUser } from "../redux/slices/authSlice";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

const Navbar = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [isOpen, setIsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // ✅ Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ Theme setup
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ✅ Real-time notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [user]);

  // ✅ Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        notifRef.current &&
        !notifRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      const updates = unread.map((n) =>
        updateDoc(doc(db, "users", user.uid, "notifications", n.id), {
          read: true,
        })
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  // ✅ Toggle Notifications + mark as read
  const handleNotifToggle = async () => {
    const newState = !notifOpen;
    setNotifOpen(newState);

    if (!notifOpen && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  // ✅ Test function (optional)
  const testNotification = async () => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "notifications"), {
      title: "Task Created",
      message: "You successfully created a new task.",
      type: "success",
      createdAt: serverTimestamp(),
      read: false,
    });
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Task Master
        </h1>

        {/* Right side */}
        <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 relative">
          {/* 🔔 Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleNotifToggle}
              className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-800 transition relative"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 animate-fadeIn z-50 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 ${
                        !n.read ? "bg-indigo-50 dark:bg-slate-700/30" : ""
                      }`}
                    >
                      <p className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 👤 Profile Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-800 transition relative"
              title="Profile"
            >
              <User size={20} />
            </button>

            {isOpen && (
              <div className="absolute right-0 top-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 animate-fadeIn">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <User size={16} /> View Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>

          {/* 🌙 Theme toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon size={18} className="text-slate-700" />
            ) : (
              <Sun size={18} className="text-yellow-400" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
