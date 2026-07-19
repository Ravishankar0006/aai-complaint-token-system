import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Lock, Mail, Eye, EyeOff, Shield, HardHat, Info, HelpCircle, X } from "lucide-react";
import { db } from "../db/mockDb";
import { User } from "../types";

interface LoginPortalProps {
  onLoginSuccess: (user: User) => void;
  onComplainantAccess: () => void;
}

// Demo credentials (prototype only - clearly marked)
const DEMO_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  dispatcher: "disp123",
  technician: "tech123",
};

export function LoginPortal({ onLoginSuccess, onComplainantAccess }: LoginPortalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Close drawer on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDrawer(false);
    };
    if (showDrawer) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showDrawer]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    // Fetch users from Supabase and verify
    (async () => {
      try {
        const users = await db.getUsers();
        const matchedUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

        if (!matchedUser) {
          setErrorMsg("Account email not registered in roster.");
          setIsLoading(false);
          return;
        }

        if (matchedUser.status === "inactive") {
          setErrorMsg("This roster account is inactive/resigned.");
          setIsLoading(false);
          return;
        }

        let isAuthorized = false;
        if (matchedUser.role === "technician") {
          // For technicians, password is exact mobile number
          isAuthorized = password === matchedUser.phone;
        } else if (matchedUser.role === "admin" || matchedUser.role === "dispatcher") {
          // For admins/dispatchers, password is mobile number OR demo password
          isAuthorized = password === matchedUser.phone || password === (DEMO_PASSWORDS[matchedUser.role] || "admin123");
        }

        if (!isAuthorized) {
          setErrorMsg("Incorrect password. Please verify credentials.");
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        onLoginSuccess(matchedUser);
      } catch (err) {
        setErrorMsg("Failed to connect to authentication server.");
        setIsLoading(false);
      }
    })();
  }, [email, password, onLoginSuccess]);

  const handleUseCredential = useCallback((demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg("");
    setShowDrawer(false);
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-airport-bg">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-blue-500/5 dark:bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-indigo-500/5 dark:bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md card p-6 md:p-8 relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/25 w-fit mx-auto mb-4">
            <Plane className="rotate-45" size={26} />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
            Operations Console
          </h2>
          <p className="section-label mt-1">IGI Airport Helpdesk</p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold border border-rose-500/20 mb-4 flex items-center gap-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="input-label">Roster Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="email"
                required
                placeholder="username@aai.aero"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="input-label">Operations Key</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Authenticate Console"
            )}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          <span className="flex-shrink mx-4 section-label">OR</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        </div>

        <button onClick={onComplainantAccess} className="btn-secondary w-full flex items-center justify-center gap-1.5 text-xs">
          <HelpCircle size={14} /> Access Complainant Portal (Public)
        </button>

        <button
          onClick={() => setShowDrawer(true)}
          className="mt-5 w-full text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1 transition-colors"
        >
          <Info size={11} /> View Demo Accounts & Credentials
        </button>
      </motion.div>

      {/* Demo Credentials Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div
            className="modal-overlay items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDrawer(false); }}
            role="dialog"
            aria-modal="true"
            aria-label="Demo credentials"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-airport-card border border-slate-200 dark:border-slate-800 rounded-t-2xl p-6 w-full max-w-md shadow-elevated max-h-[80vh] overflow-y-auto flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Info size={14} className="text-blue-500" /> Demo Roster Accounts
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Click any account to autofill credentials.</p>
                </div>
                <button onClick={() => setShowDrawer(false)} className="btn-icon" aria-label="Close drawer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { name: "Vikas Mehra", email: "vikas.mehra@aai.aero", pass: "admin123", role: "Admin", icon: Shield, color: "badge-blue" },
                  { name: "Rajesh Sharma", email: "rajesh.sharma@aai.aero", pass: "disp123", role: "Dispatcher", icon: Shield, color: "badge-purple" },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleUseCredential(acc.email, acc.pass)}
                    className="card-interactive p-3 flex items-center justify-between text-left"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{acc.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{acc.email}</span>
                    </div>
                    <span className={acc.color}>
                      <acc.icon size={8} className="inline mr-0.5" /> {acc.role}
                    </span>
                  </button>
                ))}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="section-label mb-2 block">Technicians (Pass: Mobile Number)</span>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                    {[
                      { name: "sarfaraj sahil", email: "sarfarajsahil@gmail.com", dept: "IT Helpdesk", phone: "9430917757" },
                      { name: "partham", email: "parthm@gmail.com", dept: "IT Helpdesk", phone: "8826631892" },
                      { name: "Chandrakanta jena", email: "Chandrakantajena@gmail.com", dept: "IT Helpdesk", phone: "8929807604" },
                      { name: "Shivam", email: "shivam@gmail.com", dept: "IT Helpdesk", phone: "8700378701" },
                    ].map((tech) => (
                      <button
                        key={tech.email}
                        onClick={() => handleUseCredential(tech.email, tech.phone)}
                        className="card-interactive p-2.5 flex items-center justify-between text-left"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{tech.name}</span>
                          <span className="text-[9px] text-slate-550 dark:text-slate-400 block">{tech.email} (Pass: {tech.phone})</span>
                        </div>
                        <span className="badge-slate flex items-center gap-0.5">
                          <HardHat size={8} /> {tech.dept}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
