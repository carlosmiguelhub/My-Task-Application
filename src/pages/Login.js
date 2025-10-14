import React, { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
      console.error("Login error:", err);
      dispatch(setError("Invalid email or password."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // ✅ Google Sign-In Handler
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
      console.error("Google Sign-In Error:", err);
      dispatch(setError("Google sign-in failed. Please try again."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen aurora-bg text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md p-8"
      >
        {/* Logo + Tagline */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Task Master" className="w-16 mb-3" />
          <h1 className="text-3xl font-bold text-indigo-400">Task Master</h1>
          <p className="text-slate-400 text-sm mt-1">
            Stay organized. Stay productive.
          </p>
        </div>

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

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center mb-4"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-full mb-2">
              ✓
            </div>
            <p className="text-green-400 font-medium text-sm">
              Welcome back! Redirecting...
            </p>
          </motion.div>
        )}

        {!success && (
          <>
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-400 transition"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition text-white ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
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
                  "Log In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-5">
              <div className="flex-grow h-px bg-slate-700"></div>
              <span className="px-3 text-slate-400 text-sm">or</span>
              <div className="flex-grow h-px bg-slate-700"></div>
            </div>

            {/* ✅ Google Sign-In Button */}
           <button
  onClick={handleGoogleLogin}
  disabled={loading}
  className={`flex items-center justify-center gap-3 py-2.5 w-full rounded-lg font-medium text-white transition-all duration-300 
    bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700
    hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-600
    shadow-md hover:shadow-indigo-500/30
    ${loading ? "opacity-70 cursor-not-allowed" : ""}
  `}
>
  <FaGoogle className="text-lg text-white drop-shadow-sm" />
  Continue with Google
</button>

          </>
        )}

        <p className="text-center text-slate-400 text-sm mt-6">
          Don’t have an account?{" "}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
