import React, { useEffect, useState } from "react";
import { CalendarDays, ArrowLeft, Filter, Trash2 } from "lucide-react";
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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function PlannerSummary() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all"); // all | upcoming | past | high | medium | low
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  // 👤 Ensure user & /users/{uid} doc exists (same pattern as PlannerWeekly)
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

  // 🔄 Load all plannerEvents for this user
  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "users", user.uid, "plannerEvents"),
        orderBy("start", "asc")
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              ...raw,
              start: raw.start?.toDate ? raw.start.toDate() : new Date(raw.start),
              end: raw.end?.toDate ? raw.end.toDate() : new Date(raw.end),
            };
          });
          setEvents(data);
        },
        (err) => {
          console.error("[Summary onSnapshot] error:", err);
          alert("Failed to load plan summary: " + (err?.message || ""));
        }
      );

      return () => unsub();
    } catch (e) {
      console.error("[Summary useEffect load] error:", e);
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

  // 🧮 Basic stats
  const totalPlans = events.length;
  const upcomingPlans = events.filter((e) => e.start >= now).length;
  const pastPlans = events.filter((e) => e.start < now).length;
  const highPriority = events.filter((e) => e.priority === "high").length;
  const mediumPriority = events.filter((e) => e.priority === "medium").length;
  const lowPriority = events.filter((e) => e.priority === "low").length;

  // ⏱ Duration helper
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

  // 🗑 Delete handler with confirmation
  const handleDelete = async (eventId, title) => {
    if (!user) return;

    const ok = window.confirm(
      `Delete "${title || "this plan"}"? This action cannot be undone.`
    );
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "plannerEvents", eventId));
    } catch (e) {
      console.error("[Summary delete] error:", e);
      alert("Delete failed: " + (e?.message || e));
    }
  };

  // 🔍 Filter + search
  const filtered = events.filter((e) => {
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
        <span className={base + " bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}>
          🟢 Low
        </span>
      );
    }
    return (
      <span className={base + " bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}>
        🟡 Medium
      </span>
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
              Plan Summary
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review and track all plans you created in your weekly planner.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => navigate("/planner")}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Planner
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
            Total Plans
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Past
          </p>
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
          No plans found for this filter/search.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => {
            const durationLabel = getDurationLabel(event.start, event.end);
            const isPast = event.start < now;

            return (
              <div
                key={event.id}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-4 shadow-sm flex flex-col md:flex-row md:items-start md:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                      {event.title || "Untitled plan"}
                    </h2>
                    {priorityBadge(event.priority || "medium")}
                  </div>
                  {event.agenda && (
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Agenda:</span> {event.agenda}
                    </p>
                  )}
                  {event.where && (
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Where:</span> {event.where}
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
                </div>

                <div className="md:text-right text-xs md:text-sm text-slate-500 dark:text-slate-400 min-w-[200px] flex flex-col items-start md:items-end gap-1">
                  <p>
                    {format(event.start, "EEE, MMM d yyyy")} •{" "}
                    {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
                  </p>
                  <p className="mt-1">
                    {isPast ? "✅ Past plan" : "📅 Upcoming"}
                    {durationLabel && (
                      <span className="block md:inline md:ml-2 text-[11px] md:text-xs text-slate-400 dark:text-slate-500">
                        • Duration: {durationLabel}
                      </span>
                    )}
                  </p>

                  <button
                    onClick={() => handleDelete(event.id, event.title)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Delete plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
