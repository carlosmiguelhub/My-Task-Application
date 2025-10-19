import React, { useEffect, useState } from "react";
import { Calendar as RBCalendar, momentLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment-timezone";
import { format } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, Trash2, Save, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom"; // ✅ Add this near top with other imports


// 🔥 Firebase
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ✅ Set timezone automatically
moment.tz.setDefault(moment.tz.guess());
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(RBCalendar);

// 🎨 Priority colors
const PRIORITY_COLORS = {
  high: ["#ef4444", "#f87171", "#dc2626"],
  medium: ["#f59e0b", "#fbbf24", "#d97706"],
  low: ["#10b981", "#34d399", "#059669"],
};

export default function PlannerWeekly() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(window.innerWidth < 768 ? Views.DAY : Views.WEEK);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate(); // ✅ add this

  // Modals & selection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [hoveredEventId, setHoveredEventId] = useState(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    agenda: "",
    where: "",
    description: "",
    priority: "medium",
    note: "",
  });

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  // 👤 Track logged-in user + ensure /users/{uid} exists
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          // ✅ Ensure the parent user doc exists (required by your rules)
          await setDoc(doc(db, "users", u.uid), { email: u.email ?? null }, { merge: true });
          console.log("[AUTH] Logged in as:", u.uid);
          setUser(u);
        } else {
          console.log("[AUTH] No user");
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

  // 🧠 AI NOTE GENERATOR
  const generateNoteForEvent = async (event) => {
    if (!apiKey) {
      alert("❌ Missing Gemini API key in .env");
      return;
    }
    try {
      const startTime = event.start ? new Date(event.start) : null;
      const endTime = event.end ? new Date(event.end) : null;
      const formattedTime =
        startTime && endTime
          ? `${format(startTime, "EEE, MMM d, h:mm a")} - ${format(endTime, "h:mm a")}`
          : "unspecified time";

      const prompt = `
Generate a concise professional note for this plan:
Title: ${event.title || "Untitled"}
Agenda: ${event.agenda || "N/A"}
Where: ${event.where || "N/A"}
Description: ${event.description || "N/A"}
Time: ${formattedTime}
Make it friendly, actionable, and around 2–3 sentences.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Could not generate a note.";

      setNewEvent((prev) => ({ ...prev, note: aiText }));
      alert("✨ AI Note generated successfully!");

      if (editingEvent?.id && user) {
        const docRef = doc(db, "users", user.uid, "plannerEvents", editingEvent.id);
        await updateDoc(docRef, { note: aiText });
      }
    } catch (err) {
      console.error("AI note generation failed:", err);
      alert("❌ AI note generation failed. " + (err?.message || ""));
    }
  };

  // 📱 Responsive view
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCalendarView(mobile ? Views.DAY : Views.WEEK);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 🔄 Firestore realtime sync — per user
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, "users", user.uid, "plannerEvents"), orderBy("start"));
      const unsubscribe = onSnapshot(
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
          console.error("[onSnapshot] error:", err);
          alert("Realtime load failed: " + (err?.message || ""));
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.error("[useEffect load] error:", e);
      alert("Load failed: " + (e?.message || ""));
    }
  }, [user]);

  // 🧩 Helpers
  const overlaps = (start, end, excludeId = null) =>
    events.some(
      (ev) =>
        ev.id !== excludeId &&
        ((start >= ev.start && start < ev.end) ||
          (end > ev.start && end <= ev.end) ||
          (start <= ev.start && end >= ev.end))
    );

  const getColorForDate = (date, priority) => {
    const sameDayEvents = events.filter((ev) => moment(ev.start).isSame(date, "day"));
    const shades = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
    return shades[sameDayEvents.length % shades.length];
  };

  // ✅ ADD NEW EVENT (private) — with hard errors surfaced
  const handleAddEvent = async () => {
    try {
      if (!user) throw new Error("You must be logged in.");
      if (!newEvent.title.trim() || !selectedSlot) throw new Error("Title and time are required.");

      const { start, end } = selectedSlot;
      if (overlaps(start, end)) throw new Error("Time range unavailable!");

      const color = getColorForDate(start, newEvent.priority);
      const item = {
        ...newEvent,
        start: new Date(start),
        end: new Date(end),
        color,
        allDay: false,
        createdAt: new Date(),
      };

      const path = `users/${user.uid}/plannerEvents`;
      console.log("[ADD] Writing to:", path, item);
      await addDoc(collection(db, "users", user.uid, "plannerEvents"), item);

      setIsModalOpen(false);
    } catch (err) {
      console.error("[ADD] failed:", err);
      alert("Add failed: " + (err?.message || ""));
    }
  };

  // ✅ SELECT EMPTY SLOT — add debug so we know if this fires
  const handleSelectSlot = ({ start, end }) => {
    console.log("[SELECT SLOT] start/end:", start, end);
    if (overlaps(start, end)) {
      alert("This time slot is already occupied!");
      return;
    }
    setSelectedSlot({ start, end });
    setEditingEvent(null);
    setNewEvent({
      title: "",
      agenda: "",
      where: "",
      description: "",
      priority: "medium",
      note: "",
    });
    setIsModalOpen(true);
  };

  // ✅ SELECT EXISTING EVENT
  const handleSelectEvent = (event) => {
    console.log("[SELECT EVENT]", event?.id);
    setEditingEvent(event);
    setSelectedSlot({ start: event.start, end: event.end });
    setNewEvent({
      title: event.title,
      agenda: event.agenda,
      where: event.where,
      description: event.description,
      priority: event.priority || "medium",
      note: event.note || "",
    });
    setIsModalOpen(true);
  };

  // ✅ SAVE EDIT
  const handleSaveEdit = async () => {
    try {
      if (!editingEvent || !user) throw new Error("No event / not logged in.");
      const color = getColorForDate(selectedSlot.start, newEvent.priority);
      const docRef = doc(db, "users", user.uid, "plannerEvents", editingEvent.id);

      console.log("[UPDATE] doc:", docRef.path);
      await updateDoc(docRef, {
        ...newEvent,
        start: selectedSlot.start,
        end: selectedSlot.end,
        color,
      });
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("[UPDATE] failed:", err);
      alert("Update failed: " + (err?.message || ""));
    }
  };

  // ✅ DELETE
  const handleDeleteEvent = async () => {
    try {
      if (!editingEvent || !user) throw new Error("No event / not logged in.");
      const ref = doc(db, "users", user.uid, "plannerEvents", editingEvent.id);
      console.log("[DELETE] doc:", ref.path);
      await deleteDoc(ref);
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("[DELETE] failed:", err);
      alert("Delete failed: " + (err?.message || ""));
    }
  };

  // ✅ DRAG & RESIZE
  const handleEventMoveOrResize = async ({ event, start, end }) => {
    try {
      if (!user) throw new Error("Not logged in.");
      if (overlaps(start, end, event.id)) throw new Error("Time range overlaps!");
      const ref = doc(db, "users", user.uid, "plannerEvents", event.id);
      console.log("[MOVE/RESIZE] doc:", ref.path, "->", start, end);
      await updateDoc(ref, { start: new Date(start), end: new Date(end) });
    } catch (err) {
      console.error("[MOVE/RESIZE] failed:", err);
      alert("Move/resize failed: " + (err?.message || ""));
    }
  };

  // 🎨 STYLING
  const eventPropGetter = (event) => ({
    style: {
      backgroundColor: event.color || "#6366f1",
      borderRadius: "12px",
      color: "#fff",
      border: "none",
      padding: "4px 6px",
      lineHeight: "1.2",
      whiteSpace: "normal",
      overflow: "hidden",
      cursor: "pointer",
    },
  });

  const EventComponent = ({ event }) => (
    <div
      className="relative w-full h-full overflow-visible"
      onMouseEnter={() => setHoveredEventId(event.id)}
      onMouseLeave={() => setHoveredEventId(null)}
    >
      <div className="font-semibold text-white text-[13px] leading-snug mb-[2px] break-words">
        {event.title}
      </div>
      {event.agenda && (
        <div className="text-[11px] text-white/90 leading-snug mb-[1px] break-words">
          {event.agenda}
        </div>
      )}
      <div className="text-[10px] text-white/80">
        {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
      </div>

      {hoveredEventId === event.id && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <button
            className="text-[10px] px-2 py-[2px] rounded-md bg-white/90 text-slate-800 shadow hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setEditingEvent(event);
              setNewEvent(event);
              setIsNoteOpen(true);
            }}
          >
            📝 Note
          </button>
        </motion.div>
      )}
    </div>
  );

  const calHeight = isMobile ? "80vh" : "85vh";

  // 🚧 Don’t render calendar until auth is resolved
  if (!authReady) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-300">
        Loading your planner...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-10 text-center text-slate-700 dark:text-slate-200">
        Please sign in to use your planner.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 md:p-8">
   
     {/* HEADER */}
<div className="flex items-center justify-between gap-3 mb-6">
  <div className="flex items-center gap-2">
    <CalendarDays size={22} className="text-indigo-500" />
    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
      Weekly Planner
    </h1>
  </div>

  <button
    onClick={() => navigate("/dashboard")}
    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-medium transition shadow-sm"
  >
    ← Go Back to Dashboard
  </button>
</div>


      {/* CALENDAR */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-2 md:p-4">
        <DnDCalendar
          localizer={localizer}
          culture={navigator.language || "en-US"}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          events={events}
          view={calendarView}
          onView={(v) => setCalendarView(v)}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          step={30}
          timeslots={1}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 23, 0)}
          selectable="ignoreEvents"   // 👈 makes empty-slot selection reliable
          longPressThreshold={10}     // 👈 better touch behavior
          resizable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventMoveOrResize}
          onEventResize={handleEventMoveOrResize}
          eventPropGetter={eventPropGetter}
          components={{ event: EventComponent }}
          style={{ height: calHeight }}
        />
      </div>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-[92%] max-w-md p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {editingEvent ? "Edit Plan" : "Add Plan"}
                </h2>
                {editingEvent && (
                  <button
                    onClick={() => setIsNoteOpen(true)}
                    className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-700 transition"
                    title="Open Note"
                  >
                    <StickyNote className="text-indigo-600 dark:text-indigo-400" size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                  <X size={18} className="text-slate-500 dark:text-slate-300" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                placeholder="Agenda"
                value={newEvent.agenda}
                onChange={(e) => setNewEvent({ ...newEvent, agenda: e.target.value })}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                placeholder="Where"
                value={newEvent.where}
                onChange={(e) => setNewEvent({ ...newEvent, where: e.target.value })}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <select
                value={newEvent.priority}
                onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🔴 High Priority</option>
              </select>
              <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full h-24 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none resize-none mb-4"
              />

              <div className="flex justify-end gap-3 mt-5">
                {editingEvent && (
                  <button
                    onClick={handleDeleteEvent}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={editingEvent ? handleSaveEdit : handleAddEvent}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white transition"
                >
                  <Save size={16} /> {editingEvent ? "Save" : "Add"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTE MODAL */}
      <AnimatePresence>
        {isNoteOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-[90%] max-w-lg p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <StickyNote size={18} className="text-indigo-500" /> Plan Note
                </h2>
                <button
                  onClick={() => setIsNoteOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                  <X size={18} className="text-slate-500 dark:text-slate-300" />
                </button>
              </div>

              <textarea
                value={newEvent.note}
                onChange={(e) => setNewEvent({ ...newEvent, note: e.target.value })}
                placeholder="Write or generate your note..."
                className="w-full h-40 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsNoteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => generateNoteForEvent(newEvent)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
                >
                  Generate AI Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
