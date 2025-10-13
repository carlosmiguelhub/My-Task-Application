import React, { useEffect, useState, useRef } from "react";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { clearUser } from "../redux/slices/authSlice";

const Navbar = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ✅ Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      navigate("/"); // Redirect to login page
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

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Task Master
        </h1>

        {/* Right side */}
        <div
          className="flex items-center gap-4 text-slate-700 dark:text-slate-300 relative"
          ref={dropdownRef}
        >
          {/* Profile Icon */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-800 transition relative"
            title="Profile"
          >
            <User size={20} />
          </button>

          {/* Dropdown */}
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

          {/* Theme toggle */}
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
