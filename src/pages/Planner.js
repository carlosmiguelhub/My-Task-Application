import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // ✅ added
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { PlusCircle, X, CalendarDays, ArrowLeft } from "lucide-react"; // ✅ added ArrowLeft icon

const Planner = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate(); // ✅ hook for navigation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({
    title: "",
    description: "",
    time: "",
  });

  // ✅ Load plans from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "plans"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlans(data);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ Add new plan
  const handleAddPlan = async () => {
    if (!user || !newPlan.title.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "plans"), {
        ...newPlan,
        date: selectedDate.toDateString(),
        createdAt: serverTimestamp(),
      });
      setNewPlan({ title: "", description: "", time: "" });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error adding plan:", err);
    }
  };

  // ✅ Filter plans for selected date
  const plansForSelectedDate = plans.filter(
    (plan) => plan.date === selectedDate.toDateString()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300 p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* ✅ Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            <ArrowLeft size={18} /> Go Back
          </button>

          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays size={22} className="text-indigo-500" /> Planner
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <PlusCircle size={18} /> Add Plan
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 mb-6 max-w-lg">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          className="react-calendar-custom w-full rounded-lg"
        />
      </div>

      {/* Plans for the selected day */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 max-w-3xl">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 mb-3">
          Plans for {selectedDate.toDateString()}
        </h2>

        {plansForSelectedDate.length > 0 ? (
          <ul className="space-y-3">
            {plansForSelectedDate.map((plan) => (
              <li
                key={plan.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      {plan.title}
                    </h3>
                    {plan.time && (
                      <p className="text-sm text-indigo-500">{plan.time}</p>
                    )}
                    {plan.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No plans yet for this date.
          </p>
        )}
      </div>

      {/* Modal (unchanged) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-[90%] max-w-md p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Add Plan for {selectedDate.toDateString()}
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
                value={newPlan.title}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, title: e.target.value })
                }
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                placeholder="Time (e.g. 2:00 PM - 3:00 PM)"
                value={newPlan.time}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, time: e.target.value })
                }
                className="w-full mb-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <textarea
                placeholder="Description (optional)"
                value={newPlan.description}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, description: e.target.value })
                }
                className="w-full h-24 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
              ></textarea>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlan}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Planner;
