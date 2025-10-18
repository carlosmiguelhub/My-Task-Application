import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import {
  collection,
  getDocs,
  query,
  orderBy,
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
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortField, setSortField] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");

  // ✅ Fetch all tasks from all boards
  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setLoading(true);
      const boardsSnap = await getDocs(
        query(collection(db, "users", user.uid, "boards"), orderBy("createdAt"))
      );

      let allTasks = [];
      for (const board of boardsSnap.docs) {
        const taskSnap = await getDocs(
          collection(db, "users", user.uid, "boards", board.id, "tasks")
        );
        taskSnap.forEach((t) =>
          allTasks.push({
            id: t.id,
            boardName: board.data().name,
            ...t.data(),
          })
        );
      }

      setTasks(allTasks);
      setLoading(false);
    };

    fetchTasks();
  }, [user]);

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

  // ===== UI HELPERS =====
  const tabStyles = (tab) =>
    `flex-1 py-2 text-center font-semibold rounded-lg transition-all ${
      activeTab === tab
        ? "bg-indigo-600 text-white shadow-md"
        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    }`;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="inline w-3 h-3 ml-1 text-indigo-500" />
    ) : (
      <ArrowDown className="inline w-3 h-3 ml-1 text-indigo-500" />
    );
  };

  if (loading)
    return <div className="text-center mt-10 text-gray-600">Loading tasks...</div>;

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
            className="cursor-pointer mr-3 text-gray-600 hover:text-black"
          />
          <h1 className="text-2xl font-bold">Task Summary</h1>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>

          {/* Filter */}
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Tasks</option>
            <option value="High Priority">High Priority</option>
            <option value="Due Soon">Due in 3 Days</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button className={tabStyles("Pending")} onClick={() => setActiveTab("Pending")}>
          Pending
        </button>
        <button className={tabStyles("In Progress")} onClick={() => setActiveTab("In Progress")}>
          In Progress
        </button>
        <button className={tabStyles("Done")} onClick={() => setActiveTab("Done")}>
          Completed
        </button>
      </div>

      {/* Task Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + filter + sortField + sortOrder + search}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          {sortedTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No {activeTab.toLowerCase()} tasks found.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs select-none">
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
                        className="border-b hover:bg-indigo-50 cursor-pointer transition-all"
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {task.title}
                        </td>

                        {/* ✅ Board Column with Badge */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {task.boardName}
                          </span>
                        </td>

                        {/* ✅ Priority */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              task.priority === "High"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {task.priority || "Normal"}
                          </span>
                        </td>

                        {/* ✅ Countdown Timer */}
                        <td className="py-3 px-4 w-44">
                          {task.dueDate && task.createdAt ? (
                            <CountdownTimer
                              dueDate={task.dueDate.toDate()}
                              createdAt={task.createdAt.toDate()}
                              status={task.status}
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="py-3 px-4 text-gray-600">{dueDate}</td>
                        <td className="py-3 px-4 text-gray-600">{createdAt}</td>

                        {/* Status Icon */}
                        <td className="py-3 px-4 text-center">
                          {activeTab === "Done" && (
                            <CheckCircle className="text-green-600 mx-auto" />
                          )}
                          {activeTab === "In Progress" && (
                            <Clock className="text-blue-600 mx-auto" />
                          )}
                          {activeTab === "Pending" && (
                            <AlertCircle className="text-yellow-600 mx-auto" />
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
              className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                onClick={() => setSelectedTask(null)}
              >
                <X />
              </button>
         


              <h2 className="text-xl font-bold mb-2">{selectedTask.title}</h2>
              <p className="text-gray-600 mb-4">
                {selectedTask.description || "No description."}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><strong>Board:</strong> {selectedTask.boardName}</p>
                <p><strong>Status:</strong> {selectedTask.status}</p>
                <p><strong>Priority:</strong> {selectedTask.priority || "—"}</p>
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
