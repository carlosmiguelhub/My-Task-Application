import React, { useState, useEffect } from "react";

/* ==========================================================
   ✅ COUNTDOWN TIMER (now remembers duration after refresh)
   ========================================================== */
const CountdownTimer = ({ dueDate, createdAt, status }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [barColor, setBarColor] = useState("bg-green-500");

  useEffect(() => {
    if (!dueDate || !createdAt) return;

    const startTime = new Date(createdAt);
    const endTime = new Date(dueDate);

    // ✅ Handle completed tasks
    if (status === "Done") {
      const completedBeforeDeadline = new Date() < endTime;
      setIsOverdue(!completedBeforeDeadline);
      setTimeLeft(
        completedBeforeDeadline ? "✅ Completed on time" : "❌ Completed late"
      );
      setProgress(100);
      setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = endTime - now;

      if (status === "Done") {
        clearInterval(interval);
        const completedBeforeDeadline = now < endTime;
        setIsOverdue(!completedBeforeDeadline);
        setTimeLeft(
          completedBeforeDeadline ? "✅ Completed on time" : "❌ Completed late"
        );
        setProgress(100);
        setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
        return;
      }

      if (diff <= 0) {
        clearInterval(interval);
        setIsOverdue(true);
        setTimeLeft("⚠️ Overdue");
        setProgress(100);
        setBarColor("bg-gray-500");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(
        `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`
      );

      const totalDuration = endTime - startTime;
      const elapsed = totalDuration - diff;
      const percent = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100)
      );
      setProgress(percent);

      if (percent > 90) setBarColor("bg-red-500");
      else if (percent > 70) setBarColor("bg-yellow-500");
      else setBarColor("bg-green-500");
    }, 1000);

    return () => clearInterval(interval);
  }, [dueDate, createdAt, status]);

  return (
    <div className="mt-1">
      <p
        className={`text-xs mb-1 ${
          isOverdue ? "text-red-500 font-semibold" : "text-green-600"
        }`}
      >
        {timeLeft}
      </p>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-2 ${barColor} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default CountdownTimer;
