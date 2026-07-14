import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, HardHat, Shield, Activity, Clock, Users, ArrowRight, Zap, BarChart3, ShieldCheck } from "lucide-react";
import { db } from "../db/mockDb";

interface LandingPageProps {
  onSelectRole: (role: "complainant" | "technician" | "admin") => void;
}

export function LandingPage({ onSelectRole }: LandingPageProps) {
  const [stats, setStats] = useState({
    activeTokens: 0,
    avgResolutionTime: "0m",
    activeTechs: 0,
    resolvedRate: "0%",
    slaCompliance: "0%",
  });

  useEffect(() => {
    const tokens = db.getTokens();
    const active = tokens.filter(t => ["SUBMITTED", "NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)).length;
    const resolved = tokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length;
    const total = tokens.length;
    const rate = total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%";

    // Calculate real SLA compliance: resolved tokens where resolvedAt < slaDueAt
    const resolvedTokens = tokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status));
    const withinSla = resolvedTokens.filter(t => {
      const resolvedTime = t.resolvedAt ? new Date(t.resolvedAt).getTime() : new Date(t.updatedAt).getTime();
      return resolvedTime <= new Date(t.slaDueAt).getTime();
    }).length;
    const slaRate = resolvedTokens.length > 0 ? `${Math.round((withinSla / resolvedTokens.length) * 100)}%` : "100%";

    const users = db.getUsers();
    const activeTechCount = users.filter(u => u.role === "technician" && u.status === "active").length;

    setStats({
      activeTokens: active,
      avgResolutionTime: "18m",
      activeTechs: activeTechCount,
      resolvedRate: rate,
      slaCompliance: slaRate,
    });
  }, []);

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const statCards = [
    { label: "Open Tickets", value: stats.activeTokens, icon: Activity, color: "blue" },
    { label: "Avg MTTR", value: stats.avgResolutionTime, icon: Clock, color: "amber" },
    { label: "Active Techs", value: stats.activeTechs, icon: Users, color: "emerald" },
    { label: "Resolution Rate", value: stats.resolvedRate, icon: BarChart3, color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    amber: "bg-amber-500/10 text-amber-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  const roles = [
    {
      id: "complainant" as const,
      icon: HelpCircle,
      title: "Complainant Portal",
      subtitle: "Public Access",
      description: "Submit hardware, software, or network complaints without login. Track issues using a unique ticket ID with a live milestone timeline.",
      features: ["No login required", "Real-time tracking", "Photo attachments", "Satisfaction rating"],
      cta: "File a Complaint",
      gradient: "from-blue-600 to-cyan-600",
      hoverBg: "group-hover:from-blue-600 group-hover:to-cyan-600",
    },
    {
      id: "technician" as const,
      icon: HardHat,
      title: "Technician Desk",
      subtitle: "Field Operations",
      description: "Access assigned repair queues, toggle availability, and log fixes with mandatory resolution proof and hold justifications.",
      features: ["Priority queue", "Leave management", "Resolution proofs", "Performance stats"],
      cta: "Technician Login",
      gradient: "from-emerald-600 to-teal-600",
      hoverBg: "group-hover:from-emerald-600 group-hover:to-teal-600",
    },
    {
      id: "admin" as const,
      icon: Shield,
      title: "Command Center",
      subtitle: "Admin & Dispatch",
      description: "Live Kanban boards, manual overrides, SLA monitoring, roster configuration, audit trails, and analytics leaderboards.",
      features: ["Kanban board", "Manual override", "Audit logs", "Analytics"],
      cta: "Admin Dashboard",
      gradient: "from-indigo-600 to-purple-600",
      hoverBg: "group-hover:from-indigo-600 group-hover:to-purple-600",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-14 flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <div className="text-center mb-10 md:mb-14">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-[0.15em] mb-5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          Terminal Operations Live
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
        >
          IGI Airport IT{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500">
            Helpdesk
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-4 text-sm md:text-base max-w-lg mx-auto text-slate-500 dark:text-slate-400 font-medium leading-relaxed"
        >
          Enterprise-grade complaint & token management with round-robin dispatch,
          SLA enforcement, and complete audit trails.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mt-5"
        >
          {[
            { icon: Zap, label: "Auto-Assignment" },
            { icon: ShieldCheck, label: "SLA Enforcement" },
            { icon: BarChart3, label: "Real-time Analytics" },
          ].map((pill) => (
            <span key={pill.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <pill.icon size={11} /> {pill.label}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-14"
      >
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorMap[stat.color]}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <span className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white block leading-tight">
                {stat.value}
              </span>
              <span className="section-label text-[9px]">{stat.label}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Role Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mb-8 flex-grow"
      >
        {roles.map((role) => (
          <motion.div
            key={role.id}
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="group relative card card-hover p-6 md:p-7 flex flex-col justify-between overflow-hidden"
          >
            {/* Gradient accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${role.gradient} text-white shadow-lg`}>
                  <role.icon size={22} />
                </div>
                <span className="section-label">{role.subtitle}</span>
              </div>

              <h2 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white">
                {role.title}
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {role.description}
              </p>

              {/* Feature list */}
              <div className="mt-4 grid grid-cols-2 gap-1.5">
                {role.features.map((f) => (
                  <span key={f} className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-blue-500" />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => onSelectRole(role.id)}
              className={`mt-6 flex items-center justify-between w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs group-hover:bg-gradient-to-r ${role.hoverBg} group-hover:text-white transition-all duration-300 border border-slate-200 dark:border-slate-800 group-hover:border-transparent group-hover:shadow-lg`}
            >
              <span>{role.cta}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
