import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./pages/LandingPage";
import { ComplainantPortal } from "./pages/ComplainantPortal";
import { TechnicianPanel } from "./pages/TechnicianPanel";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPortal } from "./pages/LoginPortal";
import { User } from "./types";
import { db } from "./db/mockDb";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "complainant" | "login" | "technician" | "admin">("landing");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Use ref for notification count to avoid stale closure
  const lastNotifCountRef = useRef(db.getNotifications().length);

  useEffect(() => {
    const interval = setInterval(() => {
      const allNotifs = db.getNotifications();
      if (allNotifs.length > lastNotifCountRef.current) {
        const latest = allNotifs[0];
        setToastMessage(`[${latest.channel.toUpperCase()}] to ${latest.recipient}: ${latest.message}`);
        lastNotifCountRef.current = allNotifs.length;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.role === "admin" || user.role === "dispatcher") {
      setCurrentView("admin");
    } else if (user.role === "technician") {
      setCurrentView("technician");
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setCurrentView("landing");
  }, []);

  const handleSelectRoleFromLanding = useCallback((role: "complainant" | "technician" | "admin") => {
    if (role === "complainant") {
      setCurrentView("complainant");
    } else {
      setCurrentView("login");
    }
  }, []);

  const handleNavRoleChange = useCallback((role: "landing" | "complainant" | "admin" | "technician") => {
    if (role === "landing") {
      setCurrentView("landing");
    } else if (role === "complainant") {
      setCurrentView("complainant");
    } else if (role === "admin" || role === "technician") {
      if (currentUser && currentUser.role === role) {
        setCurrentView(role);
      } else if (currentUser && (currentUser.role === "admin" || currentUser.role === "dispatcher") && role === "admin") {
        setCurrentView("admin");
      } else {
        setCurrentView("login");
      }
    }
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-airport-bg text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentRole={currentUser ? currentUser.role : currentView === "complainant" ? "complainant" : currentView === "login" ? "login" : "landing"}
        onRoleChange={handleNavRoleChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {currentView === "landing" && (
              <LandingPage onSelectRole={handleSelectRoleFromLanding} />
            )}
            {currentView === "login" && (
              <LoginPortal
                onLoginSuccess={handleLoginSuccess}
                onComplainantAccess={() => setCurrentView("complainant")}
              />
            )}
            {currentView === "complainant" && <ComplainantPortal />}
            {currentView === "technician" && currentUser && (
              <TechnicianPanel techId={currentUser.id} />
            )}
            {currentView === "admin" && currentUser && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-3 px-4 text-center">
        <p className="text-[10px] text-slate-400 font-medium">
          AAI · IGI Airport IT Helpdesk Modernization System · Complaint & Token Management v1.0
        </p>
      </footer>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-blue-500/20 max-w-sm shadow-elevated flex gap-3 items-start cursor-pointer"
            onClick={() => setToastMessage(null)}
            role="alert"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
              <Bell size={14} className="animate-swing" />
            </div>
            <div className="flex-grow text-xs min-w-0">
              <span className="font-bold text-blue-500 block mb-0.5">Notification Logged</span>
              <p className="font-medium text-slate-600 dark:text-slate-400 leading-normal truncate">{toastMessage}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToastMessage(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
