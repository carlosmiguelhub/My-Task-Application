import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  ArrowLeft,
  Filter,
  Trash2,
  X,
  History,
  ChevronDown,
  CheckCircle,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Firebase
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* ==========================================================
   COUNTDOWN: createdAt → end (sync with planner)
   ========================================================== */
const formatDiff = (ms) => {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((abs / (1000 * 60)) % 60);
  const seconds = Math.floor((abs / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const PlanDurationCountdown = ({ createdAt, end }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!end) return;

    const endDate = end instanceof Date ? end : new Date(end);
    const createdDate = createdAt
      ? createdAt instanceof Date
        ? createdAt
        : new Date(createdAt)
      : null;

    const tick = () => {
      const now = Date.now();
      const endMs = endDate.getTime();
      const remaining = endMs - now;

      if (remaining <= 0) {
        setTimeLeft(`Expired (${formatDiff(remaining)} ago)`);
      } else {
        setTimeLeft(formatDiff(remaining));
      }

      if (createdDate) {
        const durMs = endMs - createdDate.getTime();
        setDuration(formatDiff(durMs));
      } else {
        setDuration("");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, end]);

  if (!end) return null;

  return (
    <div className="mt-1 text-[11px] md:text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
      <div>
        <span className="font-semibold">Duration (created → due):</span>{" "}
        {duration || "—"}
      </div>
      <div>
        <span className="font-semibold">Time left:</span> {timeLeft}
      </div>
    </div>
  );
};

export default function PlannerSummary() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [events, setEvents] = useState([]); // active plannerEvents
  const [historyEvents, setHistoryEvents] = useState([]); // deleted → history
  const [viewMode, setViewMode] = useState("summary"); // "summary" | "history"

  const [filter, setFilter] = useState("all"); // all | upcoming | past | high | medium | low
  const [search, setSearch] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // which cards are expanded (IDs)
  const [expandedIds, setExpandedIds] = useState([]);

  // 🎉 celebration state
  const [celebrateEvent, setCelebrateEvent] = useState(null);

  const navigate = useNavigate();

  // 👤 Ensure user & /users/{uid} doc exists
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          await setDoc(
            doc(db, "users", u.uid),
            { email: u.email ?? null },
            { merge: true }
          );
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("[AUTH] setDoc error:", e);
        alert("Auth init failed: " + (e?.message || e));
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // 🔄 Load active plannerEvents
  useEffect(() => {
    if (!user) return;

    try {
      const qEvents = query(
        collection(db, "users", user.uid, "plannerEvents"),
        orderBy("start", "asc")
      );

      const unsub = onSnapshot(
        qEvents,
        (snapshot) => {
          const data = snapshot.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              ...raw,
              start: raw.start?.toDate
                ? raw.start.toDate()
                : raw.start
                ? new Date(raw.start)
                : null,
              end: raw.end?.toDate
                ? raw.end.toDate()
                : raw.end
                ? new Date(raw.end)
                : null,
              createdAt: raw.createdAt?.toDate
                ? raw.createdAt.toDate()
                : raw.createdAt
                ? new Date(raw.createdAt)
                : null,
              completedAt: raw.completedAt?.toDate
                ? raw.completedAt.toDate()
                : raw.completedAt
                ? new Date(raw.completedAt)
                : null,
              completed: !!raw.completed,
            };
          });
          setEvents(data);
        },
        (err) => {
          console.error("[Summary onSnapshot events] error:", err);
          alert("Failed to load plan summary: " + (err?.message || ""));
        }
      );

      return () => unsub();
    } catch (e) {
      console.error("[Summary useEffect events] error:", e);
      alert("Load failed: " + (e?.message || ""));
    }
  }, [user]);

  // 🔄 Load plannerHistory (deleted plans)
  useEffect(() => {
    if (!user) return;

    try {
      const qHistory = query(
        collection(db, "users", user.uid, "plannerHistory"),
        orderBy("deletedAt", "desc")
      );

      const unsub = onSnapshot(
        qHistory,
        (snapshot) => {
          const data = snapshot.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              ...raw,
              start: raw.start?.toDate
                ? raw.start.toDate()
                : raw.start
                ? new Date(raw.start)
                : null,
              end: raw.end?.toDate
                ? raw.end.toDate()
                : raw.end
                ? new Date(raw.end)
                : null,
              createdAt: raw.createdAt?.toDate
                ? raw.createdAt.toDate()
                : raw.createdAt
                ? new Date(raw.createdAt)
                : null,
              deletedAt: raw.deletedAt?.toDate
                ? raw.deletedAt.toDate()
                : raw.deletedAt
                ? new Date(raw.deletedAt)
                : null,
            };
          });
          setHistoryEvents(data);
        },
        (err) => {
          console.error("[Summary onSnapshot history] error:", err);
          alert("Failed to load plan history: " + (err?.message || ""));
        }
      );

      return () => unsub();
    } catch (e) {
      console.error("[Summary useEffect history] error:", e);
      alert("Load failed: " + (e?.message || ""));
    }
  }, [user]);

  if (!authReady) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-300">
        Loading your plan summary...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-10 text-center text-slate-700 dark:text-slate-200">
        Please sign in to view your plan summary.
      </div>
    );
  }

  const now = new Date();
  const sourceEvents = viewMode === "summary" ? events : historyEvents;

  // 🧮 Basic stats (based on current view)
  const totalPlans = sourceEvents.length;
  const upcomingPlans = sourceEvents.filter(
    (e) => e.start && e.start >= now
  ).length;
  const pastPlans = sourceEvents.filter((e) => e.start && e.start < now).length;
  const highPriority = sourceEvents.filter((e) => e.priority === "high").length;
  const mediumPriority = sourceEvents.filter(
    (e) => e.priority === "medium"
  ).length;
  const lowPriority = sourceEvents.filter((e) => e.priority === "low").length;

  // ⏱ Duration helper (start → end)
  const getDurationLabel = (start, end) => {
    if (!start || !end) return null;
    const ms = end - start;
    if (ms <= 0) return null;

    const mins = Math.round(ms / 60000);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours === 0) return `${remMins} min`;
    if (remMins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${hours} hr${hours > 1 ? "s" : ""} ${remMins} min`;
  };

  // 🗑 Delete active plan → move to history
  const handleDelete = async (event) => {
    if (!user || !event) return;
    const { id, title } = event;

    const ok = window.confirm(
      `Delete "${title || "this plan"}"? It will be moved to history.`
    );
    if (!ok) return;

    try {
      const historyRef = collection(db, "users", user.uid, "plannerHistory");
      const { id: _ignoreId, ...rest } = event;

      await addDoc(historyRef, {
        ...rest,
        originalId: id,
        deletedAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "users", user.uid, "plannerEvents", id));

      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent(null);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error("[Summary delete] error:", e);
      alert("Delete failed: " + (e?.message || e));
    }
  };

  // ✅ Mark plan as completed
  const handleComplete = async (event) => {
    if (!user || !event) return;
    try {
      await setDoc(
        doc(db, "users", user.uid, "plannerEvents", event.id),
        {
          completed: true,
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // close modal if open
      setSelectedEvent(null);
      setIsModalOpen(false);

      // open celebration popup
      setCelebrateEvent(event);
    } catch (e) {
      console.error("[Summary complete] error:", e);
      alert("Mark as completed failed: " + (e?.message || e));
    }
  };

  // 🔍 Filter + search
  const filtered = sourceEvents.filter((e) => {
    if (!e.start) return false;

    if (filter === "upcoming" && !(e.start >= now)) return false;
    if (filter === "past" && !(e.start < now)) return false;
    if (["high", "medium", "low"].includes(filter) && e.priority !== filter)
      return false;

    if (!search.trim()) return true;

    const text = (
      (e.title || "") +
      " " +
      (e.agenda || "") +
      " " +
      (e.where || "") +
      " " +
      (e.description || "") +
      " " +
      (e.note || "")
    ).toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const priorityBadge = (priority) => {
    const base =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
    if (priority === "high") {
      return (
        <span className={base + " bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}>
          🔴 High
        </span>
      );
    }
    if (priority === "low") {
      return (
        <span
          className={
            base +
            " bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          }
        >
          🟢 Low
        </span>
      );
    }
    return (
      <span
        className={
          base +
          " bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        }
      >
        🟡 Medium
      </span>
    );
  };

  const handleOpenModal = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(false);
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays size={22} className="text-indigo-500" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
              Plan {viewMode === "summary" ? "Summary" : "History"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {viewMode === "summary"
                ? "Review and track all active plans in your weekly planner."
                : "View plans you've previously deleted (kept for reference)."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => navigate("/planner")}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Planner
          </button>

          <button
            onClick={() =>
              setViewMode(viewMode === "summary" ? "history" : "summary")
            }
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium flex items-center gap-2"
          >
            <History size={16} />
            {viewMode === "summary" ? "View Plan History" : "View Summary"}
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-sm font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewMode === "summary" ? "Total Plans" : "Total History"}
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totalPlans}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upcoming
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {upcomingPlans}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Past</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {pastPlans}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-sm text-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            By Priority
          </p>
          <p className="text-slate-800 dark:text-slate-100">
            🔴 {highPriority} • 🟡 {mediumPriority} • 🟢 {lowPriority}
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 mb-5 flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter size={16} />
          <span>Filter</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
            { id: "high", label: "High" },
            { id: "medium", label: "Medium" },
            { id: "low", label: "Low" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                filter === f.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-slate-50 text-slate-700 dark:bg-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 md:text-right">
          <input
            type="text"
            placeholder="Search by title, agenda, where, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 mt-10">
          {viewMode === "summary"
            ? "No plans found for this filter/search."
            : "No history plans found for this filter/search."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => {
            const durationLabel = getDurationLabel(event.start, event.end);
            const isPast = event.start < now;
            const isExpanded = expandedIds.includes(event.id);
            const isCompleted = !!event.completed;

            return (
              <div
                key={event.id}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-4 shadow-sm transition"
              >
                {/* HEADER ROW (click to expand/collapse) */}
                <button
                  onClick={() => toggleExpanded(event.id)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                        {event.title || "Untitled plan"}
                      </h2>
                      {priorityBadge(event.priority || "medium")}
                      {isCompleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          ✅ Completed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
                      {event.start
                        ? `${format(
                            event.start,
                            "EEE, MMM d yyyy"
                          )} • ${format(event.start, "h:mm a")} – ${format(
                            event.end,
                            "h:mm a"
                          )}`
                        : "No time set"}
                    </p>
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
                      {isCompleted
                        ? "🏁 Completed plan"
                        : isPast
                        ? "✅ Past plan"
                        : "📅 Upcoming"}
                      {durationLabel && (
                        <span className="ml-1 text-[11px] md:text-xs text-slate-400 dark:text-slate-500">
                          • Session: {durationLabel}
                        </span>
                      )}
                    </p>
                    {viewMode === "history" && event.deletedAt && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Deleted on{" "}
                        {format(event.deletedAt, "EEE, MMM d yyyy • h:mm a")}
                      </p>
                    )}
                  </div>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-500 dark:text-slate-300 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* BODY (collapsible) */}
                {isExpanded && (
                  <div className="mt-3 border-t border-slate-200/70 dark:border-slate-700/70 pt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1">
                      {event.agenda && (
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Agenda:</span>{" "}
                          {event.agenda}
                        </p>
                      )}
                      {event.where && (
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Where:</span>{" "}
                          {event.where}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {event.description}
                        </p>
                      )}
                      {event.note && (
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                          “{event.note}”
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleOpenModal(event)}
                          className="inline-flex items-center gap-1 text-[11px] md:text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100"
                        >
                          View full details
                        </button>

                        {viewMode === "summary" && !isCompleted && (
                          <button
                            onClick={() => handleComplete(event)}
                            className="inline-flex items-center gap-1 text-[11px] md:text-xs px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <CheckCircle size={14} />
                            Mark as completed
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="md:text-right text-xs md:text-sm text-slate-500 dark:text-slate-400 min-w-[220px] flex flex-col items-start md:items-end gap-1">
                      {/* ⏳ Creation → due duration + live time left */}
                      <PlanDurationCountdown
                        createdAt={event.createdAt}
                        end={event.end}
                      />

                      {viewMode === "summary" && (
                        <button
                          onClick={() => handleDelete(event)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={14} />
                          Delete plan (move to history)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILS MODAL */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[95%] max-w-xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={18} className="text-slate-500 dark:text-slate-300" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={20} className="text-indigo-500" />
              <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
                {selectedEvent.title || "Untitled plan"}
              </h2>
              {priorityBadge(selectedEvent.priority || "medium")}
              {selectedEvent.completed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ✅ Completed
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Detailed view of this plan, including timing and notes.
            </p>

            <div className="space-y-2 text-xs md:text-sm text-slate-700 dark:text-slate-200">
              {selectedEvent.start && (
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {format(selectedEvent.start, "EEE, MMM d yyyy")}
                </p>
              )}
              {selectedEvent.start && selectedEvent.end && (
                <p>
                  <span className="font-semibold">Time:</span>{" "}
                  {format(selectedEvent.start, "h:mm a")} –{" "}
                  {format(selectedEvent.end, "h:mm a")}
                </p>
              )}
              <p>
                <span className="font-semibold">Session Duration:</span>{" "}
                {getDurationLabel(selectedEvent.start, selectedEvent.end) ||
                  "—"}
              </p>
              {selectedEvent.completedAt && (
                <p>
                  <span className="font-semibold">Completed on:</span>{" "}
                  {format(
                    selectedEvent.completedAt,
                    "EEE, MMM d yyyy • h:mm a"
                  )}
                </p>
              )}
              {selectedEvent.deletedAt && viewMode === "history" && (
                <p>
                  <span className="font-semibold">Deleted on:</span>{" "}
                  {format(selectedEvent.deletedAt, "EEE, MMM d yyyy • h:mm a")}
                </p>
              )}
              {selectedEvent.agenda && (
                <p>
                  <span className="font-semibold">Agenda:</span>{" "}
                  {selectedEvent.agenda}
                </p>
              )}
              {selectedEvent.where && (
                <p>
                  <span className="font-semibold">Where:</span>{" "}
                  {selectedEvent.where}
                </p>
              )}
            </div>

            {/* Countdown + duration (created → due) */}
            <div className="mt-3">
              <PlanDurationCountdown
                createdAt={selectedEvent.createdAt}
                end={selectedEvent.end}
              />
            </div>

            {selectedEvent.description && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {selectedEvent.note && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Note
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 italic whitespace-pre-line">
                  “{selectedEvent.note}”
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-col md:flex-row md:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {viewMode === "summary" && !selectedEvent.completed && (
                  <button
                    onClick={() => handleComplete(selectedEvent)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition"
                  >
                    <CheckCircle size={14} />
                    Mark as completed
                  </button>
                )}

                {viewMode === "summary" && (
                  <button
                    onClick={() => {
                      handleDelete(selectedEvent);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm bg-red-500 hover:bg-red-600 text-white transition"
                  >
                    <Trash2 size={14} />
                    Delete this plan
                  </button>
                )}
              </div>

              <button
                onClick={handleCloseModal}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs md:text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 CELEBRATION POPUP */}
      {celebrateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white p-7 rounded-2xl shadow-2xl w-[90%] max-w-md overflow-hidden">
            {/* confetti-like emojis */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-6 -left-6 text-5xl">🎉</div>
              <div className="absolute top-4 right-3 text-4xl">✨</div>
              <div className="absolute bottom-2 left-6 text-4xl">🎊</div>
            </div>

            <button
              className="absolute top-3 right-3 text-indigo-100 hover:text-white z-10"
              onClick={() => setCelebrateEvent(null)}
            >
              <X size={18} />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-4">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/40 backdrop-blur-sm">
                  <CheckCircle className="w-12 h-12 text-emerald-300" />
                </div>
              </div>

              <h2 className="text-2xl font-extrabold mb-2 tracking-tight">
                Plan Completed!
              </h2>
              <p className="text-indigo-100 text-sm mb-2 flex items-center justify-center gap-1">
                <PartyPopper size={16} />
                Awesome work, you just finished a plan.
              </p>

              <p className="text-sm bg-white/10 px-3 py-2 rounded-lg mb-4 max-w-xs">
                <span className="font-semibold">
                  {celebrateEvent.title || "Untitled plan"}
                </span>{" "}
                <span className="opacity-80">
                  is now marked as <strong>Completed</strong>.
                </span>
              </p>

              <button
                onClick={() => setCelebrateEvent(null)}
                className="w-full bg-white text-indigo-700 font-semibold py-2.5 rounded-lg shadow-md hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
