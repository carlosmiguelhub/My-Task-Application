import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import {
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Bell, Shield, ArrowRight } from "lucide-react";

const db = getFirestore();

const Register = () => {
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const passwordsMatch =
    formData.password && formData.confirmPassword
      ? formData.password === formData.confirmPassword
      : null;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { fullname, phone, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: fullname });

      // Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullname,
        phone,
        email,
        createdAt: new Date(),
      });

      await sendEmailVerification(user);

      setSuccess(
        "Account created! A verification link was sent to your email."
      );

      setFormData({
        fullname: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => navigate("/login"), 4000);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#070312] text-slate-100 overflow-hidden">

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-24 w-96 h-96 rounded-full bg-purple-500/30 blur-[120px]"
          animate={{ y: [0, 20, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 16, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[22rem] h-[22rem] rounded-full bg-fuchsia-500/25 blur-[140px]"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl lg:max-w-7xl mx-auto flex flex-col md:flex-row items-stretch gap-10 px-2 md:px-4">

        {/* Left Info Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex flex-col justify-between rounded-3xl border border-purple-500/30 bg-white/5 backdrop-blur-2xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 via-fuchsia-500 to-purple-700 flex items-center justify-center font-bold">
                TM
              </div>
              <div>
                <p className="text-sm font-semibold">Task Master</p>
                <p className="text-[11px] text-purple-200/80">
                  smart task planner
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold leading-snug mb-3">
              Create your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-200">
                Task Master account.
              </span>
            </h2>
            <p className="text-sm text-slate-300/90 mb-6">
              Start organizing your boards, tasks, and reminders in one clean
              workspace.
            </p>

            <div className="space-y-3 text-sm text-slate-200/90">
              <div className="flex items-start gap-2">
                <LayoutDashboard className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Beautiful task boards</p>
                  <p className="text-xs text-slate-400">
                    Stay organized in a well-designed workspace.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Smart reminders</p>
                  <p className="text-xs text-slate-400">
                    Emails notify you before deadlines arrive.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-purple-300" />
                <div>
                  <p className="font-medium">Secure from day one</p>
                  <p className="text-xs text-slate-400">
                    Built with Firebase Auth + Firestore.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-[11px] text-slate-500">
            Tip: Use a strong password for maximum account protection.
          </p>
        </motion.div>

        {/* Right Register Form Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full md:w-[48%] lg:w-[44%]"
        >
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.55)] border border-purple-500/30 w-full p-8 sm:p-10">

            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-xl font-semibold">Register</h1>
                <p className="text-xs text-purple-200/80">
                  Create your Task Master account
                </p>
              </div>

              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-200/80 hover:text-purple-100 transition"
              >
                Back to site <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4"
                >
                  {error}
                </motion.p>
              )}

              {success && (
                <motion.p
                  key={success}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-300 text-sm text-center bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 mb-4"
                >
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {/* Full name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Full name</label>
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className="bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Password + Confirm */}
              {[
                {
                  name: "password",
                  label: "Password",
                  placeholder: "••••••••",
                  show: showPassword,
                  toggle: () => setShowPassword(!showPassword),
                },
                {
                  name: "confirmPassword",
                  label: "Confirm password",
                  placeholder: "••••••••",
                  show: showConfirmPassword,
                  toggle: () =>
                    setShowConfirmPassword(!showConfirmPassword),
                },
              ].map((field, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={field.show ? "text" : "password"}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="w-full bg-black/30 border border-purple-500/40 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-100 placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={field.toggle}
                      className="absolute right-3 top-2.5 text-purple-300 hover:text-purple-100 transition"
                    >
                      {field.show ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {field.name === "confirmPassword" &&
                      passwordsMatch !== null && (
                        <div
                          className={`absolute right-10 top-2.5 transition-all ${
                            passwordsMatch
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {passwordsMatch ? (
                            <FaCheckCircle />
                          ) : (
                            <FaTimesCircle />
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium 
                  bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400
                  text-white shadow-lg shadow-purple-500/40 hover:brightness-110 transition-all duration-300 text-sm
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
                    />
                    Creating account...
                  </>
                ) : (
                  "Register"
                )}
              </button>
            </form>

            <p className="text-center text-purple-200/70 text-xs sm:text-sm mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-purple-200 font-medium hover:text-purple-100"
              >
                Log in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
