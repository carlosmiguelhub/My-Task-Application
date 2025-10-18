import React, { useEffect, useMemo, useState } from "react";
import { Calendar as RBCalendar, momentLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { format } from "date-fns";
import MiniCalendar from "react-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, Trash2, Save } from "lucide-react";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(RBCalendar);

// 🎨 Priority color system (with 3 shades per level for same-day variety)
const PRIORITY_COLORS = {
  high: ["#ef4444", "#f87171", "#dc2626"],    // red shades
  medium: ["#f59e0b", "#fbbf24", "#d97706"],  // amber shades
  low: ["#10b981", "#34d399", "#059669"],     // green shades
};

export default function PlannerWeekly() {
  // Calendar state
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(window.innerWidth < 768 ? Views.DAY : Views.WEEK);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // {start, end}
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    agenda: "",
    where: "",
    description: "",
    priority: "medium",
  });

  // 🧠 Responsive: switch to Day view on mobile, Week on larger screens
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCalendarView(mobile ? Views.DAY : Views.WEEK);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ Overlap checker (excludeId for edits)
  const overlaps = (start, end, excludeId = null) =>
    events.some(
      (ev) =>
        ev.id !== excludeId &&
        ((start >= ev.start && start < ev.end) ||
          (end > ev.start && end <= ev.end) ||
          (start <= ev.start && end >= ev.end))
    );

  // 🎨 Choose an event color by priority + how many events already on that day (for shade variation)
  const getColorForDate = (date, priority) => {
    const sameDayEvents = events.filter((ev) => moment(ev.start).isSame(date, "day"));
    const shades = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
    return shades[sameDayEvents.length % shades.length];
  };

  // ➕ Add new event
  const handleAddEvent = () => {
    if (!newEvent.title.trim() || !selectedSlot) return;
    const { start, end } = selectedSlot;
    if (overlaps(start, end)) return alert("Time range unavailable!");

    const color = getColorForDate(start, newEvent.priority);
    const item = {
      id: Date.now(),
      ...newEvent,
      start,
      end,
      color,
      allDay: false,
    };
    setEvents((prev) => [...prev, item]);
    setIsModalOpen(false);
  };

  // 🕳️ User selects a blank slot to create
  const handleSelectSlot = ({ start, end }) => {
    if (overlaps(start, end)) {
      alert("This time slot is already occupied!");
      return;
    }
    setSelectedSlot({ start, end });
    setEditingEvent(null);
    setNewEvent({ title: "", agenda: "", where: "", description: "", priority: "medium" });
    setIsModalOpen(true);
  };

  // ✏️ Click event to edit
  const handleSelectEvent = (event) => {
    setEditingEvent(event);
    setSelectedSlot({ start: event.start, end: event.end });
    setNewEvent({
      title: event.title,
      agenda: event.agenda,
      where: event.where,
      description: event.description,
      priority: event.priority || "medium",
    });
    setIsModalOpen(true);
  };

  // 💾 Save edits
  const handleSaveEdit = () => {
    const color = getColorForDate(selectedSlot.start, newEvent.priority);
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === editingEvent.id
          ? { ...ev, ...newEvent, color, start: selectedSlot.start, end: selectedSlot.end }
          : ev
      )
    );
    setEditingEvent(null);
    setIsModalOpen(false);
  };

  // 🗑️ Delete
  const handleDeleteEvent = () => {
    setEvents((prev) => prev.filter((ev) => ev.id !== editingEvent.id));
    setEditingEvent(null);
    setIsModalOpen(false);
  };

  // ⤴️ Drag / Resize handlers
  const handleEventMoveOrResize = ({ event, start, end }) => {
    if (overlaps(start, end, event.id)) return alert("Time range overlaps!");
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === event.id ? { ...ev, start: new Date(start), end: new Date(end) } : ev
      )
    );
  };

  // 🎨 Event styling (light/dark friendly)
  const eventPropGetter = (event) => ({
    style: {
      backgroundColor: event.color || "#6366f1",
      borderRadius: "12px",
      color: "#fff",
      border: "none",
      padding: "6px 8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
    },
  });

  // 🧱 Event content (Title + Agenda + Time)
  const EventComponent = ({ event }) => (
    <div className="leading-tight w-full">
      <div className="font-semibold text-white truncate">{event.title}</div>
      {event.agenda && <div className="text-xs/4 opacity-95 truncate">{event.agenda}</div>}
      <div className="text-[11px] opacity-90">
        {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
      </div>
    </div>
  );

  // 🗓️ Mini calendar click → jump week/day
  const onMiniPick = (date) => {
    setCurrentDate(date);
    // Keep auto view behavior (mobile Day, desktop Week)
    setCalendarView(window.innerWidth < 768 ? Views.DAY : Views.WEEK);
  };

  // Responsive calendar height
  const calHeight = isMobile ? "70vh" : "80vh";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 md:p-8">
      {/* Extra theme polish + mini calendar modern styles */}
      <style>{`
        /* React-Calendar modern card look */
        .mini-cal {
          border: none;
          background: transparent;
          width: 100%;
        }
        .mini-cal .react-calendar__navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .mini-cal .react-calendar__navigation button {
          background: transparent;
          border-radius: 10px;
          padding: 6px 10px;
        }
        .mini-cal .react-calendar__tile {
          border-radius: 10px;
          padding: 0.6rem 0.2rem;
          transition: transform .08s ease, background .2s ease;
        }
        .mini-cal .react-calendar__tile:enabled:hover {
          transform: scale(1.02);
          background: rgba(99,102,241,.12);
        }
        .mini-cal .react-calendar__tile--active {
          background: #6366f1 !important;
          color: #fff !important;
        }
        .dark .mini-cal .react-calendar__tile:enabled:hover {
          background: rgba(99,102,241,.2);
        }
        .dark .mini-cal .react-calendar__tile--active {
          background: #818cf8 !important;
        }

        /* Big calendar tweaks for light/dark grid contrast */
        .rbc-calendar {
          --cell-border: rgba(148,163,184,.35);
        }
        .rbc-time-view, .rbc-month-view, .rbc-agenda-view {
          background: white;
        }
        .dark .rbc-time-view, .dark .rbc-month-view, .dark .rbc-agenda-view {
          background: #0f172a; /* slate-900 */
        }
        .rbc-time-header, .rbc-time-content, .rbc-timeslot-group, .rbc-day-slot .rbc-time-slot {
          border-color: var(--cell-border);
        }
        .dark .rbc-time-content, .dark .rbc-timeslot-group, .dark .rbc-time-header {
          border-color: rgba(148,163,184,.25);
        }
        .rbc-toolbar {
          gap: .5rem;
        }
        .rbc-toolbar button {
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          padding: 6px 10px;
        }
        .rbc-toolbar button.rbc-active {
          background: #6366f1;
          color: white;
        }
        .dark .rbc-toolbar button {
          background: #1f2937;
          color: #e5e7eb;
        }
        .dark .rbc-toolbar button.rbc-active {
          background: #818cf8;
          color: black;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CalendarDays size={22} className="text-indigo-500" />
          Weekly Planner
        </h1>
      </div>

      {/* Top area: Mini calendar + Legend (responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Mini month calendar (always visible) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
          <MiniCalendar
            onChange={onMiniPick}
            value={currentDate}
            className="mini-cal"
            next2Label={null}
            prev2Label={null}
          />
        </div>

        {/* Legend and date summary */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-col gap-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5">
            <LegendChip color={PRIORITY_COLORS.high[0]} label="High Priority" />
            <LegendChip color={PRIORITY_COLORS.medium[0]} label="Medium Priority" />
            <LegendChip color={PRIORITY_COLORS.low[0]} label="Low Priority" />
          </div>

          {/* Current date / view controls (optional summary) */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">
              Focus: {format(currentDate, "EEE, MMM d, yyyy")}
            </span>
            <span className="hidden md:inline">•</span>
            <span>View: {calendarView === Views.DAY ? "Day" : "Week"}</span>
          </div>
        </div>
      </div>

      {/* Main Calendar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-2 md:p-4">
        <DnDCalendar
          localizer={localizer}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          events={events}
          view={calendarView}
          onView={(v) => setCalendarView(v)}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          step={30}
          timeslots={1}
          min={new Date(0, 0, 0, 8, 0)}
          max={new Date(0, 0, 0, 20, 0)}
          selectable
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

      {/* Modal: Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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

              <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                <p>
                  <strong>From:</strong>{" "}
                  {selectedSlot && format(selectedSlot.start, "EEE, MMM d • h:mm a")}
                </p>
                <p>
                  <strong>To:</strong>{" "}
                  {selectedSlot && format(selectedSlot.end, "EEE, MMM d • h:mm a")}
                </p>
              </div>

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
    </div>
  );
}

/** Small legend chip component */
function LegendChip({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-3.5 h-3.5 rounded" style={{ backgroundColor: color }} />
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  );
}
