import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { setUser, clearUser } from "./redux/slices/authSlice";
import { AnimatePresence } from "framer-motion";

// ✅ Components & Pages
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import BoardView from "./pages/BoardView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PageTransition from "./components/PageTransition";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Planner from "./pages/Planner";
import GoogleCalendarTest from "./pages/GoogleCalendarTest";
import Documents from "./pages/Documents";
import { Toaster } from "react-hot-toast";
import ArchiveView from "./pages/ArchiveView";
import Summary from "./pages/Summary";


/* ✅ Layout Wrapper — Handles Navbar/Footer visibility */
function LayoutWrapper({ children }) {
  const location = useLocation();

  // Hide Navbar + Footer on Login & Register pages
  const noHeaderFooterRoutes = ["/", "/register"];
  // Hide only Footer on Dashboard
  const noFooterRoutes = ["/dashboard"];

  const hideHeaderFooter = noHeaderFooterRoutes.includes(location.pathname);
  const hideFooter = noFooterRoutes.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {!hideHeaderFooter && <Navbar />}
      <main className="flex-grow overflow-x-hidden">{children}</main>
      {!hideHeaderFooter && !hideFooter && <Footer />}
    </div>
  );
}

/* ✅ Protected Route — Restrict access for unauthenticated users */
function ProtectedRoute({ children }) {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ✅ Main App Component */
function App() {
  const dispatch = useDispatch();
  const location = useLocation();

  // 🔹 Sync Firebase Auth state with Redux
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "",
          })
        );
      } else {
        dispatch(clearUser());
      }
    });
    return () => unsubscribe();
  }, [dispatch]);

  return (
    <LayoutWrapper>
      <>
        {/* 🔹 Toast notifications */}
        <Toaster position="top-right" />

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* =================== PUBLIC ROUTES =================== */}
            <Route
              path="/"
              element={
                <PageTransition>
                  <Login />
                </PageTransition>
              }
            />
            <Route
              path="/register"
              element={
                <PageTransition>
                  <Register />
                </PageTransition>
              }
            />

            {/* =================== PROTECTED ROUTES =================== */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                </ProtectedRoute>
              }
            />

            {/* ✅ Board view */}
            <Route
              path="/board/:id"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <BoardView />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
  path="/archive/:id"
  element={
    <ProtectedRoute>
      <PageTransition>
        <ArchiveView />
      </PageTransition>
    </ProtectedRoute>
  }
/>

            {/* ✅ FIXED — Documents now use board ID from URL */}
            <Route
              path="/board/:id/documents"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Documents />
                  </PageTransition>
                </ProtectedRoute>
              }
            />

            {/* ✅ Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ✅ Analytics */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* ✅ Planner */}
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <Planner />
                </ProtectedRoute>
              }
            />

            {/* ✅ Google Calendar Test */}
            <Route
              path="/calendar-test"
              element={<GoogleCalendarTest />}
            />
              <Route path="/summary" element={<Summary />} />

          </Routes>
        </AnimatePresence>
      </>
    </LayoutWrapper>
  );
}

/* ✅ Router Wrapper — ensures Router context for useLocation */
export default function AppRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
