// ✅ Countdown Timer with Progress Bar and Stop on Done (Fixed)
const CountdownTimer = ({ dueDate, status }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [barColor, setBarColor] = useState("bg-green-500");
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    if (!dueDate) return;

    // Always clear any existing timer before starting a new one
    if (intervalId) clearInterval(intervalId);

    const startTime = new Date();
    const endTime = new Date(dueDate);

    // ✅ If task is already "Done" at render — stop immediately
    if (status === "Done") {
      const now = new Date();
      const completedBeforeDeadline = now < endTime;
      setIsOverdue(!completedBeforeDeadline);
      setTimeLeft(
        completedBeforeDeadline
          ? "✅ Completed on time"
          : "❌ Completed late"
      );
      setProgress(100);
      setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
      return; // don’t start interval
    }

    // Otherwise, start real-time countdown
    const interval = setInterval(() => {
      const now = new Date();
      const diff = endTime - now;

      // Stop timer if task gets marked "Done" while running
      if (status === "Done") {
        clearInterval(interval);
        const completedBeforeDeadline = now < endTime;
        setIsOverdue(!completedBeforeDeadline);
        setTimeLeft(
          completedBeforeDeadline
            ? "✅ Completed on time"
            : "❌ Completed late"
        );
        setProgress(100);
        setBarColor(completedBeforeDeadline ? "bg-green-500" : "bg-red-500");
        return;
      }

      // If time’s up
      if (diff <= 0) {
        clearInterval(interval);
        setIsOverdue(true);
        setTimeLeft("⚠️ Overdue");
        setProgress(100);
        setBarColor("bg-gray-500");
        return;
      }

      // Update progress and color
      const totalDuration = endTime - startTime;
      const elapsed = totalDuration - diff;
      const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setProgress(percent);

      if (percent > 90) setBarColor("bg-red-500");
      else if (percent > 70) setBarColor("bg-yellow-500");
      else setBarColor("bg-green-500");

      // Countdown text
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`
      );
      setIsOverdue(false);
    }, 1000);

    // Keep the interval ID so we can clear it on re-render
    setIntervalId(interval);

    // Cleanup
    return () => clearInterval(interval);
  }, [dueDate, status]); // ✅ rerun whenever status changes

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
