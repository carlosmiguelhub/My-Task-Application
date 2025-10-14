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
import { motion } from "framer-motion";

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
      // ✅ Create the user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // ✅ Update user profile (display name)
      await updateProfile(user, { displayName: fullname });

      // ✅ Store additional info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullname,
        phone,
        email,
        createdAt: new Date(),
      });

      // ✅ Send verification email
      await sendEmailVerification(user);

      // ✅ Success message
      setSuccess(
        "Account created! A verification link has been sent to your email. Please verify before logging in."
      );
      setFormData({
        fullname: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      // Optional: Redirect to login after a short delay
      setTimeout(() => navigate("/"), 4000);
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
    <div className="flex items-center justify-center min-h-screen aurora-bg text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md p-8"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-indigo-400">
          Create Account ✨
        </h2>
        <p className="text-center text-slate-400 mb-6">
          Join Task Master and get productive!
        </p>

        {/* ✅ Error Message */}
        {error && (
          <motion.p
            key={error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        {/* ✅ Success Message */}
        {success && (
          <motion.p
            key={success}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-sm text-center mb-4"
          >
            {success}
          </motion.p>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            name="fullname"
            placeholder="Full Name"
            value={formData.fullname}
            onChange={handleChange}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
            required
          />

          {/* Password + Confirm Password Fields */}
          {[
            {
              name: "password",
              placeholder: "Password",
              value: formData.password,
              show: showPassword,
              toggle: () => setShowPassword(!showPassword),
            },
            {
              name: "confirmPassword",
              placeholder: "Confirm Password",
              value: formData.confirmPassword,
              show: showConfirmPassword,
              toggle: () => setShowConfirmPassword(!showConfirmPassword),
            },
          ].map((field, i) => (
            <div key={i} className="relative">
              <input
                type={field.show ? "text" : "password"}
                name={field.name}
                placeholder={field.placeholder}
                value={field.value}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                required
              />
              <button
                type="button"
                onClick={field.toggle}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-400 transition"
              >
                {field.show ? <FaEyeSlash /> : <FaEye />}
              </button>

              {field.name === "confirmPassword" && passwordsMatch !== null && (
                <div
                  className={`absolute right-10 top-2.5 transition-transform duration-300 ${
                    passwordsMatch ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {passwordsMatch ? <FaCheckCircle /> : <FaTimesCircle />}
                </div>
              )}
            </div>
          ))}

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
                Creating Account...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-5">
          Already have an account?{" "}
          <Link to="/" className="text-indigo-400 hover:text-indigo-300">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
