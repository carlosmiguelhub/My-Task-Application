import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();

  // ✅ Update on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { name: "Home", icon: <Home size={20} />, path: "/dashboard" },
    { name: "Boards", icon: <LayoutGrid size={20} />, path: "/boards" },
    { name: "Planner", icon: <Calendar size={20} />, path: "/planner" },
    { name: "Settings", icon: <Settings size={20} />, path: "/settings" },
  ];

  return (
    <>
      {/* ===== Desktop Sidebar ===== */}
      <motion.div
        animate={{ width: isCollapsed ? "80px" : "220px" }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col fixed left-0 top-0 z-40"
      >
        <div className="p-4 flex flex-col h-full relative">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-6">
              Task Master
            </h1>
          )}

          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-700 text-indigo-600 dark:text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ✅ Collapse toggle centered */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition"
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>
      </motion.div>

      {/* ===== Mobile Drawer ===== */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* ✅ Background overlay */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
            ></motion.div>

            {/* ✅ Sidebar Drawer */}
            <motion.div
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="fixed inset-y-0 left-0 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 p-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  Task Master
                </h1>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={20} className="text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-700 text-indigo-600 dark:text-white"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ✅ Mobile trigger button (always visible on top) */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 p-2 bg-indigo-600 text-white rounded-lg shadow-lg z-[9999] hover:bg-indigo-700 transition"
        >
          <Menu size={20} />
        </button>
      )}
    </>
  );
};

export default Sidebar;
