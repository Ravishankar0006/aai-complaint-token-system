import { useState, useEffect, useCallback } from "react";
import { SlaTimer } from "../components/SlaTimer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  AlertTriangle,
  Users,
  History,
  Download,
  UserPlus,
  RefreshCw,
  Clock,
  Briefcase,
  UserCheck,
  UserX,
  Shuffle,
  CalendarDays,
  BarChart3,
  Star,
  CheckCircle,
  X,
} from "lucide-react";
import { db, autoAssignToken, manualAssignToken, updateTokenStatus, toggleTechnicianLeave } from "../db/mockDb";
import { Token, TechnicianStatus, User, TokenHistory, TechStatus, TokenStatus } from "../types";

export function AdminDashboard() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [techStatuses, setTechStatuses] = useState<TechnicianStatus[]>([]);
  const [historyLogs, setHistoryLogs] = useState<TokenHistory[]>([]);
  
  // Navigation tabs: board (Kanban), roster (Technicians), audit (Logs), reports (Analytics)
  const [activeSubTab, setActiveSubTab] = useState<"board" | "roster" | "audit" | "reports">("board");

  // Roster addition form modal state
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState("");
  const [newTechEmail, setNewTechEmail] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");
  const [newTechDept, setNewTechDept] = useState("IT Helpdesk");

  // Search/Filter states
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation modal states (replacing browser confirm/prompt)
  const [confirmResignId, setConfirmResignId] = useState<string | null>(null);
  const [holdModalTokenId, setHoldModalTokenId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [resolveModalTokenId, setResolveModalTokenId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [assignModalTokenId, setAssignModalTokenId] = useState<string | null>(null);

  const loadData = () => {
    setTokens(db.getTokens());
    const allUsers = db.getUsers();
    setTechnicians(allUsers.filter((u) => u.role === "technician"));
    setTechStatuses(db.getTechStatuses());
    
    // Sort logs newest first
    const logs = db.getHistory();
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setHistoryLogs(sortedLogs);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("cts_db_updated", loadData);
    return () => window.removeEventListener("cts_db_updated", loadData);
  }, []);

  const handleManualReassign = (tokenId: string, techId: string) => {
    const res = manualAssignToken(tokenId, techId, "admin-1", "Vikas Mehra (Admin)", "admin");
    if (res.success) {
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleTriggerAutoAssign = (tokenId: string) => {
    const res = autoAssignToken(tokenId);
    alert(res.message);
    loadData();
  };

  const handleAddTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim() || !newTechEmail.trim() || !newTechPhone.trim()) {
      alert("Please fill in all technician details");
      return;
    }

    const allUsers = db.getUsers();
    const allTechStatuses = db.getTechStatuses();

    const newId = `tech-${Date.now()}`;
    const newUser: User = {
      id: newId,
      name: newTechName,
      email: newTechEmail,
      role: "technician",
      phone: newTechPhone,
      status: "active",
      department: newTechDept,
      createdAt: new Date().toISOString()
    };

    // Calculate rotation position: find max rotation position for that department and add 1
    const deptStatuses = allTechStatuses.filter((s) => s.department === newTechDept);
    const maxPos = deptStatuses.length > 0 ? Math.max(...deptStatuses.map((s) => s.rotationPosition)) : 0;

    const newStatus: TechnicianStatus = {
      userId: newId,
      currentStatus: "available",
      department: newTechDept,
      rotationPosition: maxPos + 1
    };

    db.saveUsers([...allUsers, newUser]);
    db.saveTechStatuses([...allTechStatuses, newStatus]);

    // Reset Form
    setNewTechName("");
    setNewTechEmail("");
    setNewTechPhone("");
    setShowAddTechModal(false);
    loadData();
  };

  const handleToggleTechLeave = (techId: string, currentStatus: TechStatus) => {
    const res = toggleTechnicianLeave(techId, currentStatus);
    if (res.success) {
      loadData();
    }
  };

  const handleResignTech = useCallback((techId: string) => {
    setConfirmResignId(techId);
  }, []);

  const confirmResign = useCallback(() => {
    if (!confirmResignId) return;
    const allTechStatuses = db.getTechStatuses();
    const idx = allTechStatuses.findIndex((s) => s.userId === confirmResignId);
    if (idx !== -1) {
      const allUsers = db.getUsers();
      const userIdx = allUsers.findIndex((u) => u.id === confirmResignId);
      allTechStatuses[idx].currentStatus = "resigned";
      if (userIdx !== -1) {
        allUsers[userIdx].status = "inactive";
      }
      db.saveTechStatuses(allTechStatuses);
      db.saveUsers(allUsers);
      loadData();
    }
    setConfirmResignId(null);
  }, [confirmResignId]);

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, tokenId: string) => {
    e.dataTransfer.setData("text/plain", tokenId);
  };

  const handleDrop = (e: React.DragEvent, targetStatuses: string[]) => {
    e.preventDefault();
    const tokenId = e.dataTransfer.getData("text/plain");
    if (!tokenId) return;

    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    if (targetStatuses.includes(token.status)) return;

    const newStatus = targetStatuses[0] as TokenStatus;

    if (newStatus === "ON_HOLD") {
      setHoldModalTokenId(tokenId);
      setHoldReason("");
    } else if (newStatus === "RESOLVED") {
      setResolveModalTokenId(tokenId);
      setResolveNote("");
    } else if (newStatus === "NEW" || newStatus === "SUBMITTED") {
      updateTokenStatus(tokenId, "NEW", "admin-1", "Admin Override", "admin");
      loadData();
    } else if (newStatus === "ASSIGNED") {
      if (token.assignedTo) {
        updateTokenStatus(tokenId, "ASSIGNED", "admin-1", "Admin Override", "admin");
        loadData();
      } else {
        setAssignModalTokenId(tokenId);
      }
    } else if (newStatus === "IN_PROGRESS") {
      if (!token.assignedTo) return;
      updateTokenStatus(tokenId, "IN_PROGRESS", "admin-1", "Admin Override", "admin");
      loadData();
    }
  };

  const handleHoldConfirm = () => {
    if (!holdModalTokenId || !holdReason.trim()) return;
    updateTokenStatus(holdModalTokenId, "ON_HOLD", "admin-1", "Admin Override", "admin", { holdReason: holdReason.trim() });
    setHoldModalTokenId(null);
    setHoldReason("");
    loadData();
  };

  const handleResolveConfirm = () => {
    if (!resolveModalTokenId || !resolveNote.trim()) return;
    updateTokenStatus(resolveModalTokenId, "RESOLVED", "admin-1", "Admin Override", "admin", { resolutionNote: resolveNote.trim() });
    setResolveModalTokenId(null);
    setResolveNote("");
    loadData();
  };

  const handleAssignSelect = (techId: string) => {
    if (!assignModalTokenId) return;
    manualAssignToken(assignModalTokenId, techId, "admin-1", "Admin Override", "admin");
    setAssignModalTokenId(null);
    loadData();
  };

  const handleExportAuditCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Token ID,Actor,Actor Role,From Status,To Status,Audit Notes\n";

    historyLogs.forEach((log) => {
      const row = [
        log.timestamp,
        log.tokenId,
        log.actorName,
        log.actorRole,
        log.fromStatus,
        log.toStatus,
        `"${(log.note || "").replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `igi_helpdesk_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for department filtering
  const filteredTokens = tokens.filter((t) => {
    const matchesDept = selectedDeptFilter === "All" || t.department === selectedDeptFilter;
    const matchesSearch =
      t.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Calculate stats for Admin header
  const openTokens = tokens.filter((t) => ["SUBMITTED", "NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status));
  const slaBreachedTokens = openTokens.filter((t) => new Date(t.slaDueAt) < new Date());
  
  // Kanban columns configuration
  const COLUMNS: { title: string; status: string[]; bgClass: string }[] = [
    { title: "Submitted / New", status: ["SUBMITTED", "NEW"], bgClass: "bg-slate-900/10 border-slate-200 dark:border-slate-800" },
    { title: "Assigned", status: ["ASSIGNED"], bgClass: "bg-blue-500/5 border-blue-500/10" },
    { title: "In Progress", status: ["IN_PROGRESS"], bgClass: "bg-purple-500/5 border-purple-500/10" },
    { title: "On Hold", status: ["ON_HOLD"], bgClass: "bg-amber-500/5 border-amber-500/10" },
    { title: "Resolved / Closed", status: ["RESOLVED", "VERIFIED_CLOSED"], bgClass: "bg-emerald-500/5 border-emerald-500/10" }
  ];

  const getPriorityBorderClass = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "border-l-4 border-l-rose-500";
      case "HIGH":
        return "border-l-4 border-l-amber-500";
      case "MEDIUM":
        return "border-l-4 border-l-blue-500";
      default:
        return "border-l-4 border-l-slate-400";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-500";
      case "HIGH":
        return "bg-amber-500/10 text-amber-500";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

  const getTechStatusBadgeClass = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "busy":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
      case "on_leave":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default:
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Admin Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800/80 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-500" /> Command & Dispatch Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Real-time incident dispatch, manual overrides, and operations monitoring.
          </p>
        </div>

        {/* Global filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveSubTab("board")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "board"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Activity size={14} /> Kanban Board
            </button>
            <button
              onClick={() => setActiveSubTab("roster")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "roster"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Users size={14} /> Tech Roster
            </button>
            <button
              onClick={() => setActiveSubTab("audit")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "audit"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <History size={14} /> Audit Trail
            </button>
            <button
              onClick={() => setActiveSubTab("reports")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "reports"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <BarChart3 size={14} /> Analytics
            </button>
          </div>

          <button
            onClick={loadData}
            title="Reload Roster Data"
            className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* SLA Alert panel for open tickets */}
      {slaBreachedTokens.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-4 mb-6 shadow flex items-center gap-3.5">
          <AlertTriangle className="shrink-0 animate-bounce" size={24} />
          <div>
            <span className="font-extrabold text-sm block">SLA Escalation Alert!</span>
            <p className="text-xs font-medium text-rose-400 mt-0.5">
              There are {slaBreachedTokens.length} open tickets that have breached their target SLA deadlines. Attention required.
            </p>
          </div>
        </div>
      )}

      {/* Main Tab Views */}
      <AnimatePresence mode="wait">
        {activeSubTab === "board" && (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            {/* Board Filters */}
            <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Department:</span>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {["All", "IT Helpdesk", "Electrical", "Plumbing", "HVAC"].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDeptFilter(dept)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        selectedDeptFilter === dept
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {dept.replace("Helpdesk", "")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Search token by ID or issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-3 py-1.5 text-xs w-full text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((col) => {
                const columnTokens = filteredTokens.filter((t) => col.status.includes(t.status));
                
                return (
                  <div
                    key={col.title}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.status)}
                    className={`rounded-2xl border p-4 flex flex-col gap-4 min-w-[240px] max-h-[600px] overflow-y-auto transition-all ${col.bgClass}`}
                  >
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {col.title}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-extrabold text-slate-400">
                        {columnTokens.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {columnTokens.map((token) => {
                        const isSlaBreached = new Date(token.slaDueAt) < new Date() && !["RESOLVED", "VERIFIED_CLOSED"].includes(token.status);
                        const assignedTech = technicians.find((t) => t.id === token.assignedTo);
                        const eligibleTechs = technicians.filter(
                          (t) => t.department === token.department && t.status === "active"
                        );

                        return (
                          <div
                            key={token.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, token.id)}
                            className={`bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 flex flex-col gap-3 shadow hover:shadow-md cursor-grab active:cursor-grabbing transition-all relative ${getPriorityBorderClass(
                              token.priority
                            )} ${isSlaBreached ? "ring-1 ring-rose-500/50" : ""}`}
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                  {token.trackingId}
                                </span>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                                  {token.category}
                                </span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${getPriorityBadgeClass(token.priority)}`}>
                                {token.priority.slice(0, 4)}
                              </span>
                            </div>

                            {/* Brief Description */}
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2 font-medium">
                              {token.description}
                            </p>

                            {/* Details (Tech assigned / Dispatch button) */}
                            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                              {/* SLA Badge */}
                              <SlaTimer dueAt={token.slaDueAt} isResolvedOrClosed={["RESOLVED", "VERIFIED_CLOSED"].includes(token.status)} />

                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                {token.assignedTo ? (
                                  <span className="text-[9px] text-blue-500 font-bold flex items-center gap-0.5">
                                    <Briefcase size={10} /> {assignedTech?.name || "Tech"}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleTriggerAutoAssign(token.id)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                  >
                                    <Shuffle size={8} /> Auto Assign
                                  </button>
                                )}

                                {/* Manual Override Selector */}
                                <select
                                  value={token.assignedTo || ""}
                                  onChange={(e) => handleManualReassign(token.id, e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 cursor-pointer max-w-[100px] outline-none"
                                >
                                  <option value="" disabled>
                                    Manual Override
                                  </option>
                                  {eligibleTechs.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                      {tech.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {columnTokens.length === 0 && (
                        <div className="text-center py-6 text-[10px] text-slate-500 font-medium">
                          Drag tickets here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === "roster" && (
          <motion.div
            key="roster"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            {/* Header controls for roster */}
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-blue-500" /> Active Duty Roster ({technicians.length} Technicians)
              </h3>
              <button
                onClick={() => setShowAddTechModal(true)}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
              >
                <UserPlus size={14} /> Add Technician
              </button>
            </div>

            {/* Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technicians.map((tech) => {
                const statusObj = techStatuses.find((s) => s.userId === tech.id);
                const currentStatus = statusObj ? statusObj.currentStatus : "available";
                const rotationPos = statusObj ? statusObj.rotationPosition : 0;
                
                // Metrics
                const techTokens = tokens.filter((t) => t.assignedTo === tech.id);
                const busyCount = techTokens.filter((t) => ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)).length;
                const closedCount = techTokens.filter((t) => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length;

                return (
                  <div
                    key={tech.id}
                    className={`bg-white dark:bg-[#0b0f19] border rounded-2xl p-5 shadow-md flex flex-col gap-4 relative transition-colors ${
                      currentStatus === "resigned"
                        ? "border-slate-200 dark:border-slate-900 opacity-60"
                        : "border-slate-200 dark:border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Tech Details */}
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 bg-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center font-extrabold text-sm">
                        {tech.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {tech.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {tech.department} • Pos {rotationPos}
                        </span>
                      </div>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-200 dark:border-slate-800/60 rounded-xl text-center">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Status</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold block mt-1 ${getTechStatusBadgeClass(currentStatus)}`}>
                          {currentStatus.replace("_", " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Open Tickets</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mt-1">{busyCount}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Resolved</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mt-1">{closedCount}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    {currentStatus !== "resigned" && (
                      <div className="flex gap-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
                        <button
                          onClick={() => handleToggleTechLeave(tech.id, currentStatus)}
                          className={`flex-grow py-1 px-3.5 text-[10px] font-bold rounded-lg border transition-colors ${
                            currentStatus === "on_leave"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/25 hover:bg-amber-500/20"
                          }`}
                        >
                          {currentStatus === "on_leave" ? (
                            <span className="flex items-center justify-center gap-1"><UserCheck size={11} /> End Leave</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1"><CalendarDays size={11} /> Set Leave</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleResignTech(tech.id)}
                          className="py-1 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/10 hover:text-rose-500 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 transition-colors flex items-center justify-center gap-1"
                        >
                          <UserX size={11} /> Resign
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col gap-6"
          >
            {/* Audit Logs controls */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <History size={18} className="text-blue-500" /> Immutable Event Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Append-only log system recording all state modifications.</p>
              </div>
              <button
                onClick={handleExportAuditCSV}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow transition-colors"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 pr-4">Timestamp</th>
                    <th className="pb-3 pr-4">Token ID</th>
                    <th className="pb-3 pr-4">Transition</th>
                    <th className="pb-3 pr-4">Actor</th>
                    <th className="pb-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 pr-4 text-slate-400 font-bold whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 pr-4 text-blue-500 font-extrabold">{log.tokenId.slice(0, 10)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-200 dark:border-slate-800">
                          {log.fromStatus} → {log.toStatus}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {log.actorName} <span className="text-[9px] uppercase font-bold text-slate-500">({log.actorRole})</span>
                      </td>
                      <td className="py-3 text-xs italic font-medium max-w-sm truncate text-slate-400">
                        {log.note || "State modification logged."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeSubTab === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Tickets Created</span>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">{tokens.length}</span>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Activity size={24} />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Resolved / Closed</span>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                    {tokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <CheckCircle size={24} />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">SLA Compliance Rate</span>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                    {(() => {
                      const resolved = tokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status));
                      if (resolved.length === 0) return "100%";
                      const withinSla = resolved.filter(t => {
                        const resolvedTime = t.resolvedAt ? new Date(t.resolvedAt).getTime() : new Date(t.updatedAt).getTime();
                        return resolvedTime <= new Date(t.slaDueAt).getTime();
                      }).length;
                      return `${Math.round((withinSla / resolved.length) * 100)}%`;
                    })()}
                  </span>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                  <Clock size={24} />
                </div>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown SVG Chart */}
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow">
                <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider block mb-4">Tickets by Department Rota</span>
                
                <div className="h-64 w-full flex items-end justify-around gap-2 pt-6">
                  {db.getDepartments().map((d) => {
                    const count = tokens.filter((t) => t.department === d.name).length;
                    const maxCount = Math.max(...db.getDepartments().map(dep => tokens.filter(t => t.department === dep.name).length), 1);
                    const heightPercent = Math.max((count / maxCount) * 80, 8); // at least 8% height visually

                    return (
                      <div key={d.id} className="flex flex-col items-center gap-2 flex-grow max-w-[80px] group cursor-pointer">
                        <div className="w-full flex items-end justify-center h-48 relative">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="w-8 md:w-10 rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300 transition-colors shadow-md relative"
                          >
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {count}
                            </span>
                          </motion.div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 text-center truncate w-full">
                          {d.name.replace("Helpdesk", "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roster Leaderboard Table */}
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow flex flex-col gap-4">
                <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider block">Technician Leaderboard</span>
                
                <div className="overflow-y-auto max-h-56">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-400 font-bold">
                        <th className="pb-2 pr-4">Technician</th>
                        <th className="pb-2 pr-4">Roster Department</th>
                        <th className="pb-2 pr-4 text-center">Resolved</th>
                        <th className="pb-2 text-right">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                      {technicians.map((tech) => {
                        const techTokens = tokens.filter(t => t.assignedTo === tech.id);
                        const closed = techTokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length;
                        const rated = techTokens.filter(t => t.rating !== undefined);
                        const avgRating = rated.length > 0
                          ? (rated.reduce((acc, t) => acc + (t.rating || 0), 0) / rated.length).toFixed(1)
                          : "N/A";

                        return (
                          <tr key={tech.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/10">
                            <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-100">{tech.name}</td>
                            <td className="py-2.5 pr-4 text-slate-500">{tech.department}</td>
                            <td className="py-2.5 pr-4 text-center text-blue-500 font-bold">{closed}</td>
                            <td className="py-2.5 text-right font-extrabold text-amber-500 flex items-center justify-end gap-1">
                              <Star size={10} className="fill-amber-500 inline" /> {avgRating}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Technician Modal */}
      {showAddTechModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddTechModal(false); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Add Roster Technician</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure new service personnel for the dispatch rota.</p>
              </div>
              <button onClick={() => setShowAddTechModal(false)} className="btn-icon" aria-label="Close"><X size={16} /></button>
            </div>

            <form onSubmit={handleAddTechnician} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Name</label>
                <input type="text" required placeholder="e.g. Karan Malhotra" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Email Address</label>
                <input type="email" required placeholder="e.g. karan.m@aai.aero" value={newTechEmail} onChange={(e) => setNewTechEmail(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Phone Contact</label>
                <input type="text" required placeholder="e.g. +919922334455" value={newTechPhone} onChange={(e) => setNewTechPhone(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Department</label>
                <select value={newTechDept} onChange={(e) => setNewTechDept(e.target.value)} className="input text-xs cursor-pointer">
                  <option value="IT Helpdesk">IT Helpdesk</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setShowAddTechModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Create Technician</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Resign Confirmation Modal */}
      {confirmResignId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmResignId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><AlertTriangle size={20} /></div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Confirm Resignation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This permanently disables their rotation assignments.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmResignId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={confirmResign} className="btn-danger text-xs">Confirm Resign</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hold Reason Modal (Kanban drag) */}
      {holdModalTokenId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setHoldModalTokenId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Hold Reason Required</h3>
            <div className="flex flex-col gap-1.5">
              <label className="input-label">Block Reason</label>
              <textarea rows={3} required placeholder="Why is this ticket being put on hold?" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="input text-xs resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setHoldModalTokenId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleHoldConfirm} disabled={!holdReason.trim()} className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 shadow-amber-600/20">Confirm Hold</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Resolve Note Modal (Kanban drag) */}
      {resolveModalTokenId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setResolveModalTokenId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Resolution Notes Required</h3>
            <div className="flex flex-col gap-1.5">
              <label className="input-label">Resolution Explanation</label>
              <textarea rows={3} required placeholder="Describe how the issue was resolved..." value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="input text-xs resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResolveModalTokenId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleResolveConfirm} disabled={!resolveNote.trim()} className="btn-success text-xs">Submit Resolution</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Assign Technician Modal (Kanban drag) */}
      {assignModalTokenId && (() => {
        const token = tokens.find(t => t.id === assignModalTokenId);
        const eligibleTechs = token ? technicians.filter(t => t.department === token.department && t.status === "active") : [];
        return (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAssignModalTokenId(null); }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Assign Technician</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a technician to assign this ticket to.</p>
                </div>
                <button onClick={() => setAssignModalTokenId(null)} className="btn-icon" aria-label="Close"><X size={16} /></button>
              </div>
              {eligibleTechs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active technicians in this department.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {eligibleTechs.map((tech) => {
                    const ts = techStatuses.find(s => s.userId === tech.id);
                    return (
                      <button
                        key={tech.id}
                        onClick={() => handleAssignSelect(tech.id)}
                        className="card-interactive p-3 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">{tech.name.charAt(0)}</div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{tech.name}</span>
                            <span className="text-[9px] text-slate-500 block">Pos {ts?.rotationPosition || "?"}</span>
                          </div>
                        </div>
                        <span className={`badge ${ts?.currentStatus === "available" ? "badge-emerald" : ts?.currentStatus === "busy" ? "badge-purple" : "badge-amber"}`}>
                          {ts?.currentStatus || "unknown"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
