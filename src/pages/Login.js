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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-[#0f0a19] text-white">

      {/* Purple Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-purple-600/30 blur-[120px]"
          animate={{ y: [0, 20, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-[140px]"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity }}
        />
      </div>

      {/* Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-500/30 w-full max-w-md p-8"
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Task Master" className="w-16 mb-4 rounded-xl shadow-lg" />

          {/* Gradient Purple Text */}
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-200">
            Task Master
          </h1>

          <p className="text-purple-200/80 text-sm mt-1">
            Stay organized. Stay productive.
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              key={error}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-red-400 text-sm text-center mb-4"
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
            <div className="w-12 h-12 flex items-center justify-center bg-purple-500 rounded-full text-white mb-2">
              ✓
            </div>
            <p className="text-purple-300 font-medium text-sm">
              Welcome back! Redirecting...
            </p>
          </motion.div>
        )}

        {!success && (
          <>
            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1b1429] border border-purple-500/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                required
              />

              {/* Password Field */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1b1429] border border-purple-500/30 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
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

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium 
                  bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 text-white shadow-lg shadow-purple-500/40 
                  hover:brightness-110 transition-all duration-300
                  ${loading ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    ></motion.span>
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-5">
              <div className="flex-grow h-px bg-purple-500/30"></div>
              <span className="px-3 text-purple-200/80 text-sm">or</span>
              <div className="flex-grow h-px bg-purple-500/30"></div>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`flex items-center justify-center gap-3 py-2.5 w-full rounded-lg font-medium 
                bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 text-white 
                hover:from-purple-500 hover:via-fuchsia-400 hover:to-purple-500
                shadow-lg shadow-purple-600/30 transition-all duration-300
                ${loading ? "opacity-70 cursor-not-allowed" : ""}
              `}
            >
              <FaGoogle className="text-lg text-white drop-shadow-sm" />
              Continue with Google
            </button>
          </>
        )}

        <p className="text-center text-purple-200/70 text-sm mt-6">
          Don’t have an account?{" "}
          <Link to="/register" className="text-purple-300 hover:text-purple-200">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
