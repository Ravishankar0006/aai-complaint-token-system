import { useEffect, useState } from "react";
import { Plane, HelpCircle, Home, LogOut, Key, Sun, Moon, Database } from "lucide-react";
import { User, UserRole } from "../types";

type NavRole = "landing" | "complainant" | "admin" | "technician" | "manager" | "login";

interface NavbarProps {
  currentRole: NavRole;
  onRoleChange: (role: "landing" | "complainant" | "admin" | "technician") => void;
  currentUser: User | null;
  onLogout: () => void;
}

export function Navbar({ currentRole, onRoleChange, currentUser, onLogout }: NavbarProps) {
  const [theme, setTheme] = useState(() => localStorage.getItem("cts_theme") || "dark");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("cts_theme", theme);
  }, [theme]);

  const handleResetDb = () => {
    if (window.confirm("Reset all data to defaults? This cannot be undone.")) {
      // Inline the reset logic to avoid importing the full db module
      const keysToRemove = [
        "cts_users", "cts_tokens", "cts_tech_statuses", "cts_token_history",
        "cts_assignment_logs", "cts_last_assigned_pointers", "cts_notifications", "cts_app_version",
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const map: Record<UserRole, { label: string; color: string }> = {
      admin: { label: "Admin", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      manager: { label: "Manager", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
      technician: { label: "Technician", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      complainant: { label: "Public", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    };
    return map[role] || map.complainant;
  };

  return (
    <nav className="sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/95 dark:bg-airport-bg/90 backdrop-blur-lg transition-colors duration-200">
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 cursor-pointer select-none group"
        onClick={() => onRoleChange("landing")}
        role="button"
        tabIndex={0}
        aria-label="Go to home page"
        onKeyDown={(e) => e.key === "Enter" && onRoleChange("landing")}
      >
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl text-white shadow-lg shadow-blue-600/25 group-hover:shadow-blue-600/40 transition-shadow">
          <Plane className="rotate-45" size={18} />
        </div>
        <div>
          <span className="font-extrabold tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
            AAI <span className="text-blue-500 text-lg leading-none">·</span> IGI AIRPORT
          </span>
          <span className="text-[8px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block font-bold">
            Helpdesk Operations Console
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3">
        {currentUser ? (
          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-900/60 p-1.5 pl-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
            {/* Avatar */}
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {currentUser.name.charAt(0)}
            </div>

            <div className="flex flex-col text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser.name}
              </span>
              <span className={`text-[8px] uppercase font-bold px-1.5 py-0 rounded border inline-block mt-0.5 w-fit ${getRoleBadge(currentUser.role).color}`}>
                {getRoleBadge(currentUser.role).label}
              </span>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <button
              onClick={onLogout}
              className="py-1.5 px-2.5 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 dark:text-slate-400 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1"
              aria-label="Log out"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        ) : (
          <div className="tab-group gap-0.5">
            <button
              onClick={() => onRoleChange("landing")}
              className={currentRole === "landing" ? "tab-active" : "tab-inactive"}
              aria-label="Home"
            >
              <Home size={13} />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              onClick={() => onRoleChange("complainant")}
              className={currentRole === "complainant" ? "tab-active" : "tab-inactive"}
              aria-label="Raise an issue"
            >
              <HelpCircle size={13} />
              <span className="hidden sm:inline">Raise Issue</span>
            </button>

            <button
              onClick={() => onRoleChange("admin")}
              className={currentRole === "login" ? "tab-active" : "tab-inactive"}
              aria-label="Staff login"
            >
              <Key size={13} />
              <span className="hidden sm:inline">Staff Login</span>
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="btn-icon"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Reset DB (dev tool) */}
        <button
          onClick={handleResetDb}
          className="btn-icon hidden md:flex"
          aria-label="Reset database"
          title="Reset Database"
        >
          <Database size={14} />
        </button>
      </div>
    </nav>
  );
}
