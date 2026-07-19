import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plane, Lock, Mail, Eye, EyeOff, HelpCircle } from "lucide-react";
import { db } from "../db/mockDb";
import { User } from "../types";

interface LoginPortalProps {
  onLoginSuccess: (user: User) => void;
  onComplainantAccess: () => void;
}

// Demo credentials (prototype only - clearly marked)
const DEMO_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  manager: "manager123",
  technician: "tech123",
};

export function LoginPortal({ onLoginSuccess, onComplainantAccess }: LoginPortalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        } else if (matchedUser.role === "admin" || matchedUser.role === "manager") {
          // For admins/managers, password is mobile number OR demo password
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

      </motion.div>
    </div>
  );
}
