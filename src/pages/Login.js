import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setLoading, setError } from "../redux/slices/authSlice";
import logo from "../assets/Taskimage.png";
import { LayoutDashboard, Bell, Shield, ArrowRight } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(setError(null));
    dispatch(setLoading(true));

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      dispatch(
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
        })
      );

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      dispatch(setError("Invalid email or password."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGoogleLogin = async () => {
    dispatch(setError(null));
    dispatch(setLoading(true));

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      dispatch(
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
        })
      );

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      dispatch(setError("Google sign-in failed. Please try again."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#070312] text-slate-100 overflow-hidden">
      {/* Background glows to match landing page */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-24 w-96 h-96 rounded-full bg-purple-500/30 blur-[120px]"
          animate={{ y: [0, 20, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[22rem] h-[22rem] rounded-full bg-fuchsia-500/25 blur-[140px]"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-[-3rem] w-40 h-40 rounded-full bg-purple-300/25 blur-[80px]"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main content wrapper */}
<div className="relative z-10 w-full max-w-6xl lg:max-w-7xl mx-auto flex flex-col md:flex-row items-stretch gap-10 px-2 md:px-4">
        {/* Left panel – brand & benefits */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex flex-col justify-between rounded-3xl border border-purple-500/30 bg-white/5 backdrop-blur-2xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 via-fuchsia-500 to-purple-700 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/60">
                TM
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Task Master</p>
                <p className="text-[11px] text-purple-200/80">
                  smart task planner
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold leading-snug mb-3">
              Welcome back to your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-200">
                focused workspace.
              </span>
            </h2>
            <p className="text-sm text-slate-300/90 mb-6">
              Log in to manage boards, track progress, and let automatic
              reminders handle upcoming deadlines.
            </p>

            <div className="space-y-3 text-sm text-slate-200/90">
              <div className="flex items-start gap-2">
                <LayoutDashboard className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Clean task boards</p>
                  <p className="text-xs text-slate-400">
                    See your work organized into boards, lists, and tasks.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Smart email reminders</p>
                  <p className="text-xs text-slate-400">
                    Get notified before deadlines so nothing slips.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Secure & private</p>
                  <p className="text-xs text-slate-400">
                    Backed by Firebase Auth and Firestore. Your data stays
                    yours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-[11px] text-slate-500">
            Tip: Log in, create a board, and let Task Master remember the rest.
          </p>
        </motion.div>

        {/* Right panel – actual auth card */}
        <motion.div
          initial={{ opacity: 0, x: 20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1"
        >
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] border border-purple-500/30 w-full p-6 sm:p-8">
            {/* Logo + Title */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Task Master"
                  className="w-10 h-10 rounded-2xl shadow-lg shadow-purple-700/50 object-cover"
                />
                <div>
                  <h1 className="text-lg font-semibold">Sign in</h1>
                  <p className="text-xs text-purple-200/80">
                    Continue to Task Master dashboard
                  </p>
                </div>
              </div>

              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-200/80 hover:text-purple-100 transition"
              >
                Back to site
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-red-400 text-xs sm:text-sm text-center mb-4 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center mb-4"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full text-white mb-2 shadow-lg shadow-purple-500/50">
                  ✓
                </div>
                <p className="text-purple-200 font-medium text-sm">
                  Welcome back! Redirecting...
                </p>
              </motion.div>
            )}

            {!success && (
              <>
                {/* Form */}
                <form
                  onSubmit={handleLogin}
                  className="flex flex-col gap-4 sm:gap-5"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-300">
                      Email address
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-300">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-purple-300 hover:text-purple-200 transition"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium 
                      bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 text-white text-sm
                      shadow-lg shadow-purple-500/40 hover:brightness-110 transition-all duration-300
                      ${loading ? "opacity-70 cursor-not-allowed" : ""}
                    `}
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        ></motion.span>
                        Logging in...
                      </>
                    ) : (
                      "Log in"
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-5">
                  <div className="flex-grow h-px bg-purple-500/30" />
                  <span className="px-3 text-purple-200/80 text-[11px]">
                    or continue with
                  </span>
                  <div className="flex-grow h-px bg-purple-500/30" />
                </div>

                {/* Google Login */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className={`flex items-center justify-center gap-3 py-2.5 w-full rounded-xl font-medium 
                    bg-black/40 border border-purple-500/40 text-sm
                    hover:bg-black/30 hover:border-purple-300
                    shadow-lg shadow-purple-700/30 transition-all duration-300
                    ${loading ? "opacity-70 cursor-not-allowed" : ""}
                  `}
                >
                  <FaGoogle className="text-base text-white drop-shadow-sm" />
                  Continue with Google
                </button>
              </>
            )}

            <p className="text-center text-purple-200/70 text-xs sm:text-sm mt-6">
              Don’t have an account?{" "}
              <Link
                to="/register"
                className="text-purple-200 font-medium hover:text-purple-100"
              >
                Register
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
