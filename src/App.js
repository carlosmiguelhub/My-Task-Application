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
import PlannerSummary from "./pages/PlannerSummary";   // ✅ Correct import
import GoogleCalendarTest from "./pages/GoogleCalendarTest";
import Documents from "./pages/Documents";
import { Toaster } from "react-hot-toast";
import ArchiveView from "./pages/ArchiveView";

/* ✅ Layout Wrapper — Handles Navbar/Footer visibility */
function LayoutWrapper({ children }) {
  const location = useLocation();

  const noHeaderFooterRoutes = ["/", "/register"];
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
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              }
            />

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

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* =================== PLANNER ROUTES =================== */}
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <Planner />
                </ProtectedRoute>
              }
            />

            {/* ✅ NEW: Planner Summary page */}
            <Route
              path="/planner-summary"
              element={
          
                  <PageTransition>
                    <PlannerSummary />
                  </PageTransition>
                
              }
            />

            {/* Optional alias: /summary → /planner-summary */}
            <Route
              path="/summary"
              element={<Navigate to="/planner-summary" replace />}
            />

            <Route path="/calendar-test" element={<GoogleCalendarTest />} />
          </Routes>
        </AnimatePresence>
      </>
    </LayoutWrapper>
  );
}

/* Router Wrapper */
export default function AppRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
