import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CountdownTimer from "../components/CountdownTimer";

const Summary = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [boardFilter, setBoardFilter] = useState("All Boards");
  const [dateFilter, setDateFilter] = useState("Any Time");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortField, setSortField] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");

  // ✅ Fetch all tasks from all boards
  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const boardsSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "boards"),
            orderBy("createdAt")
          )
        );

        let allTasks = [];
        for (const board of boardsSnap.docs) {
          const taskSnap = await getDocs(
            collection(db, "users", user.uid, "boards", board.id, "tasks")
          );
          taskSnap.forEach((t) =>
            allTasks.push({
              id: t.id,
              boardId: board.id,
              boardName: board.data().name,
              ...t.data(),
            })
          );
        }

        setTasks(allTasks);
      } catch (err) {
        console.error("Error loading tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  // ===== QUICK ACTIONS =====
  const handleQuickStatusChange = async (task, newStatus) => {
    if (!user || !task.boardId) return;

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "boards",
        task.boardId,
        "tasks",
        task.id
      );
      await updateDoc(taskRef, { status: newStatus });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  // ===== STATS / KPIs =====
  const totalTasks = tasks.length;

  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate?.toDate || t.status === "Done") return false;
    return t.dueDate.toDate() < new Date();
  }).length;

  const todayCount = tasks.filter((t) => {
    if (!t.dueDate?.toDate) return false;
    const d = t.dueDate.toDate();
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }).length;

  const completedCount = tasks.filter((t) => t.status === "Done").length;
  const completionRate = totalTasks
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;
  const doneCount = completedCount;

  const uniqueBoards = [
    "All Boards",
    ...Array.from(new Set(tasks.map((t) => t.boardName).filter(Boolean))),
  ];

  // ===== FILTERING =====
  const filteredTasks = tasks
    .filter((t) => t.status === activeTab)
    .filter((t) => {
      if (filter === "All") return true;

      if (filter === "Overdue" && t.dueDate)
        return new Date(t.dueDate.toDate()) < new Date();

      if (filter === "Due Soon" && t.dueDate) {
        const diff =
          (new Date(t.dueDate.toDate()) - new Date()) / (1000 * 60 * 60 * 24);
        return diff <= 3 && diff > 0;
      }

      if (filter === "High Priority") return t.priority === "High";

      return true;
    })
    .filter((t) => {
      if (boardFilter === "All Boards") return true;
      return t.boardName === boardFilter;
    })
    .filter((t) => {
      if (!t.dueDate?.toDate || dateFilter === "Any Time") return true;

      const d = t.dueDate.toDate();
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      if (dateFilter === "Today") {
        return d >= startOfToday && d < endOfToday;
      }

      if (dateFilter === "This Week") {
        const day = now.getDay();
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - day);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return d >= startOfWeek && d < endOfWeek;
      }

      if (dateFilter === "This Month") {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      return true;
    })
    .filter((t) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(term) ||
        t.boardName?.toLowerCase().includes(term)
      );
    });

  // ===== SORTING =====
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;

    const getValue = (task, field) => {
      if (field === "priority") {
        const map = { High: 3, Medium: 2, Low: 1, Normal: 0 };
        return map[task.priority] || 0;
      }
      if (field === "dueDate" || field === "createdAt") {
        return task[field]?.toDate ? task[field].toDate().getTime() : 0;
      }
      return task[field] || "";
    };

    const valA = getValue(a, sortField);
    const valB = getValue(b, sortField);

    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });

  // ===== INSIGHTS =====
  const boardCounts = tasks.reduce((acc, t) => {
    if (!t.boardName) return acc;
    acc[t.boardName] = (acc[t.boardName] || 0) + 1;
    return acc;
  }, {});

  const mostActiveBoardEntry = Object.entries(boardCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  let avgLeadTimeDays = null;
  const leadTimes = tasks
    .filter((t) => t.dueDate?.toDate && t.createdAt?.toDate)
    .map(
      (t) =>
        (t.dueDate.toDate() - t.createdAt.toDate()) / (1000 * 60 * 60 * 24)
    );
  if (leadTimes.length) {
    avgLeadTimeDays =
      Math.round(
        (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10
      ) / 10;
  }

  // ===== UI HELPERS =====
  const tabStyles = (tab) =>
    `flex-1 flex items-center justify-center gap-2 py-2 text-center font-semibold rounded-lg transition-all text-sm ${
      activeTab === tab
        ? "bg-indigo-600 text-white shadow-md"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    }`;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="inline w-3 h-3 ml-1 text-indigo-400" />
    ) : (
      <ArrowDown className="inline w-3 h-3 ml-1 text-indigo-400" />
    );
  };

  const cardClass =
    "rounded-xl px-4 py-4 border bg-white border-slate-200 text-slate-900 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100";

  const filterSelectClass =
    "border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  const searchInputClass =
    "pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

  const tableWrapperClass =
    "overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white dark:border-slate-800 dark:bg-slate-900";

  const tableHeaderClass =
    "bg-slate-100 text-slate-600 uppercase text-xs select-none dark:bg-slate-800/80 dark:text-slate-400";

  const tableRowClass =
    "border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-all dark:border-slate-800 dark:hover:bg-slate-800/70";

  const modalClass =
    "bg-white p-6 rounded-xl shadow-xl w-full max-w-lg relative border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100";

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center">
          <ArrowLeft
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer mr-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Task Summary
          </h1>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={searchInputClass}
            />
          </div>

          {/* Filters */}
          <select
            className={filterSelectClass}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Tasks</option>
            <option value="High Priority">High Priority</option>
            <option value="Due Soon">Due in 3 Days</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            className={filterSelectClass}
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
          >
            {uniqueBoards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className={filterSelectClass}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="Any Time">Any Time</option>
            <option value="Today">Due Today</option>
            <option value="This Week">Due This Week</option>
            <option value="This Month">Due This Month</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className={`${cardClass} animate-pulse`}>
              <div className="h-3 w-16 bg-slate-200 rounded mb-3 dark:bg-slate-800" />
              <div className="h-6 w-20 bg-slate-200 rounded dark:bg-slate-800" />
            </div>
          ))
        ) : (
          <>
            <div className={cardClass}>
              <p className="text-xs text-slate-400">Total Tasks</p>
              <p className="text-2xl font-semibold mt-1">{totalTasks}</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-slate-400">Due Today</p>
              <p className="text-2xl font-semibold mt-1 text-amber-500">
                {todayCount}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-slate-400">Overdue</p>
              <p className="text-2xl font-semibold mt-1 text-red-500">
                {overdueCount}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-slate-400">Completion Rate</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-500">
                {completionRate}%
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          className={tabStyles("Pending")}
          onClick={() => setActiveTab("Pending")}
        >
          <span>Pending</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 border border-white/30 dark:bg-black/30">
            {pendingCount}
          </span>
        </button>
        <button
          className={tabStyles("In Progress")}
          onClick={() => setActiveTab("In Progress")}
        >
          <span>In Progress</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 border border-white/30 dark:bg-black/30">
            {inProgressCount}
          </span>
        </button>
        <button
          className={tabStyles("Done")}
          onClick={() => setActiveTab("Done")}
        >
          <span>Completed</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 border border-white/30 dark:bg-black/30">
            {doneCount}
          </span>
        </button>
      </div>

      {/* Task Table / Loading / Empty */}
      <AnimatePresence mode="wait">
        <motion.div
          key={
            activeTab +
            filter +
            sortField +
            sortOrder +
            search +
            boardFilter +
            dateFilter +
            (loading ? "-loading" : "-ready")
          }
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          {loading ? (
            <div className={`${tableWrapperClass} p-6 animate-pulse`}>
              <div className="h-4 w-1/3 bg-slate-200 rounded mb-4 dark:bg-slate-800" />
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full bg-slate-50 border-b border-slate-100 last:border-b-0 dark:bg-slate-900 dark:border-slate-800"
                />
              ))}
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 mb-1 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-700 dark:text-slate-200">
                No {activeTab.toLowerCase()} tasks found.
              </span>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-3 text-xs px-3 py-1.5 rounded-full border border-indigo-500 text-indigo-500 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className={tableWrapperClass}>
              <table className="min-w-full text-sm">
                <thead className={tableHeaderClass}>
                  <tr>
                    <th className="py-3 px-4 text-left">Task</th>
                    <th className="py-3 px-4 text-left">Board</th>
                    <th
                      className="py-3 px-4 text-left cursor-pointer"
                      onClick={() => handleSort("priority")}
                    >
                      Priority <SortIcon field="priority" />
                    </th>
                    <th className="py-3 px-4 text-left">Duration</th>
                    <th
                      className="py-3 px-4 text-left cursor-pointer"
                      onClick={() => handleSort("dueDate")}
                    >
                      Due Date <SortIcon field="dueDate" />
                    </th>
                    <th
                      className="py-3 px-4 text-left cursor-pointer"
                      onClick={() => handleSort("createdAt")}
                    >
                      Created <SortIcon field="createdAt" />
                    </th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const dueDate = task.dueDate?.toDate
                      ? task.dueDate.toDate().toLocaleDateString()
                      : "-";
                    const createdAt = task.createdAt?.toDate
                      ? task.createdAt.toDate().toLocaleDateString()
                      : "-";

                    return (
                      <tr
                        key={task.id}
                        className={tableRowClass}
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {task.title}
                        </td>

                        {/* Board */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-medium border border-indigo-500/30 dark:text-indigo-300">
                            {task.boardName}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              task.priority === "High"
                                ? "bg-red-500/10 text-red-600 border border-red-500/40 dark:text-red-300"
                                : task.priority === "Medium"
                                ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/40 dark:text-yellow-300"
                                : "bg-green-500/10 text-green-600 border border-green-500/40 dark:text-green-300"
                            }`}
                          >
                            {task.priority || "Normal"}
                          </span>
                        </td>

                        {/* Countdown */}
                        <td className="py-3 px-4 w-44">
                          {task.dueDate && task.createdAt ? (
                            <CountdownTimer
                              dueDate={task.dueDate.toDate()}
                              createdAt={task.createdAt.toDate()}
                              status={task.status}
                            />
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {dueDate}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {createdAt}
                        </td>

                        {/* Status icon */}
                        <td className="py-3 px-4 text-center">
                          {activeTab === "Done" && (
                            <CheckCircle className="text-emerald-500 mx-auto" />
                          )}
                          {activeTab === "In Progress" && (
                            <Clock className="text-blue-500 mx-auto" />
                          )}
                          {activeTab === "Pending" && (
                            <AlertCircle className="text-yellow-500 mx-auto" />
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (task.boardId) {
                                navigate(`/board/${task.boardId}`);
                              }
                            }}
                            className="text-[11px] px-3 py-1 rounded-full bg-transparent border border-slate-400 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            View
                          </button>
                          {task.status !== "Done" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickStatusChange(task, "Done");
                              }}
                              className="text-[11px] px-3 py-1 rounded-full border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                            >
                              Mark Done
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* INSIGHTS */}
      {!loading && tasks.length > 0 && (
        <div className="mt-4 text-xs flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
          {mostActiveBoardEntry && (
            <span>
              Most active board:{" "}
              <span className="text-slate-800 dark:text-slate-200">
                {mostActiveBoardEntry[0]}
              </span>{" "}
              ({mostActiveBoardEntry[1]} tasks)
            </span>
          )}
          {typeof avgLeadTimeDays === "number" && (
            <span>
              Average planned duration:{" "}
                <span className="text-slate-800 dark:text-slate-200">
                  {avgLeadTimeDays} day
                  {avgLeadTimeDays === 1 ? "" : "s"}
                </span>
            </span>
          )}
        </div>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={modalClass}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => setSelectedTask(null)}
              >
                <X />
              </button>

              <h2 className="text-xl font-bold mb-2">
                {selectedTask.title}
              </h2>
              <p className="mb-4 text-slate-700 dark:text-slate-300">
                {selectedTask.description || "No description."}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <p>
                  <strong>Board:</strong> {selectedTask.boardName}
                </p>
                <p>
                  <strong>Status:</strong> {selectedTask.status}
                </p>
                <p>
                  <strong>Priority:</strong>{" "}
                  {selectedTask.priority || "—"}
                </p>
                <p>
                  <strong>Due Date:</strong>{" "}
                  {selectedTask.dueDate?.toDate
                    ? selectedTask.dueDate.toDate().toLocaleString()
                    : "—"}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {selectedTask.createdAt?.toDate
                    ? selectedTask.createdAt.toDate().toLocaleString()
                    : "—"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Summary;
