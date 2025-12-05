import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";

const AiCoachChat = () => {
  const { user } = useSelector((state) => state.auth);

  // 🔹 Derive a nice display name from user object
  const fullName =
    user?.fullname ||
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: fullName
        ? `Hi ${fullName}! 👋\nI'm your Task Master AI coach.\n\nYou can ask me things like:\n• How many active task i have?\n• Which tasks are most urgent today?\n• How should I plan the rest of my day?`
        : `Hi! 👋\nI'm your Task Master AI coach.\n\nYou can ask me things like:\n• How many Task are due tomorrow/week?\n• Which tasks are most urgent today?\n• How should I plan the rest of my day?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggle = () => setOpen((prev) => !prev);

  const appendMessage = (msg) =>
    setMessages((prev) => [...prev, msg]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!user) {
      appendMessage({
        role: "assistant",
        content:
          "It looks like you’re not signed in. Please log in first so I can look at your workspace and give accurate suggestions.",
      });
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: input.trim() };
    appendMessage(userMsg);
    setInput("");
    setLoading(true);

    try {
      const apiUrl =
        process.env.REACT_APP_AI_COACH_URL || "/aiCoachLite";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          message: userMsg.content,
        }),
      });

      const data = await res.json();
      const reply =
        data?.reply ||
        "I wasn’t able to generate a recommendation just now. Please try asking again in a moment.";

      appendMessage({ role: "assistant", content: reply });
    } catch (err) {
      console.error("AI coach error:", err);
      appendMessage({
        role: "assistant",
        content:
          "Something went wrong while contacting the AI coach. Please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:scale-105 transition-transform"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI Coach</span>
      </button>

      {/* Fullscreen chat modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleToggle}
            />

            {/* Centered chat window */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
            >
              <div className="w-full max-w-3xl h-[520px] md:h-[620px] rounded-3xl shadow-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-slate-800/80 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl p-2.5 bg-indigo-100 dark:bg-indigo-900/50">
                      <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.15em] text-slate-400">
                        Task Master
                      </div>
                      <div className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">
                        AI Productivity Coach
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Ask about priorities, focus, and planning.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggle}
                    className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 text-sm">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        m.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                          m.role === "user"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-3.5 py-2.5 max-w-[70%] bg-slate-50 dark:bg-slate-900/80 text-[12px] text-slate-500 dark:text-slate-300 italic border border-dashed border-slate-200/80 dark:border-slate-800/80">
                        Thinking through your tasks…
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 p-3 md:p-4">
                  <div className="flex items-end gap-2 md:gap-3">
                    <textarea
                      className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-3.5 py-2.5 text-xs md:text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-h-28"
                      rows={3}
                      placeholder='Ask something like: “What should I focus on for the next hour?”'
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="rounded-2xl px-3 py-2 md:px-4 md:py-3 bg-indigo-600 disabled:bg-indigo-300 text-white flex items-center justify-center gap-1 text-xs md:text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden md:inline">Send</span>
                    </button>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    Press <span className="font-semibold">Enter</span> to send ·{" "}
                    <span className="font-semibold">Shift + Enter</span> for a
                    new line
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiCoachChat;
