import { useState, useEffect, useMemo } from "react";
import { SlaTimer } from "../components/SlaTimer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  AlertTriangle,
  Users,
  History,
  Download,
  RefreshCw,
  Clock,
  Briefcase,
  UserCheck,
  Shuffle,
  CalendarDays,
  BarChart3,
  Star,
  CheckCircle,
  X,
  Edit,
  Trash2,
  Eye,
  Filter,
  Plus,
  Layers,
} from "lucide-react";
import { db, autoAssignToken, manualAssignToken, updateTokenStatus, toggleTechnicianLeave } from "../db/mockDb";
import { Token, TechnicianStatus, User, TokenHistory, TechStatus, TokenStatus } from "../types";

interface AdminDashboardProps {
  currentUser: User;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [techStatuses, setTechStatuses] = useState<TechnicianStatus[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [historyLogs, setHistoryLogs] = useState<TokenHistory[]>([]);

  // Navigation tabs: board (Kanban), roster (Staff Roster), audit (Logs), reports (Analytics)
  const [activeSubTab, setActiveSubTab] = useState<"board" | "roster" | "audit" | "reports">("board");

  // Roster Sub-Toggle: technicians vs admins
  const [rosterType, setRosterType] = useState<"technicians" | "admins">("technicians");

  // Technician Modals & Forms
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState("");
  const [newTechEmail, setNewTechEmail] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");
  const [newTechDept, setNewTechDept] = useState("IT Helpdesk");

  const [showTechDetailsId, setShowTechDetailsId] = useState<string | null>(null);

  const [showEditTechId, setShowEditTechId] = useState<string | null>(null);
  const [editTechName, setEditTechName] = useState("");
  const [editTechEmail, setEditTechEmail] = useState("");
  const [editTechPhone, setEditTechPhone] = useState("");
  const [editTechDept, setEditTechDept] = useState("IT Helpdesk");

  const [confirmDeleteTechId, setConfirmDeleteTechId] = useState<string | null>(null);

  // Administrator Modals & Forms
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState<string | null>(null);

  // Board Filter States
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [slaFilter, setSlaFilter] = useState("All"); // All, Breached, Imminent, Normal
  const [searchQuery, setSearchQuery] = useState("");

  // Kanban Drag Modals & Simple Triggers
  const [holdModalTokenId, setHoldModalTokenId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [resolveModalTokenId, setResolveModalTokenId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [assignModalTokenId, setAssignModalTokenId] = useState<string | null>(null);

  // Detailed Complaint Management Modal
  const [showManageTokenId, setShowManageTokenId] = useState<string | null>(null);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [editTokenCategory, setEditTokenCategory] = useState("");
  const [editTokenDesc, setEditTokenDesc] = useState("");
  const [editTokenPriority, setEditTokenPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW");
  const [editTokenDept, setEditTokenDept] = useState("IT Helpdesk");
  const [confirmDeleteTokenId, setConfirmDeleteTokenId] = useState<string | null>(null);

  // Board Presentation Toggles
  const [boardLayout, setBoardLayout] = useState<"standard" | "wide">("wide");
  const [boardDensity, setBoardDensity] = useState<"detailed" | "compact">("detailed");

  const loadData = async () => {
    try {
      const freshTokens = await db.getTokens();
      setTokens(freshTokens);
      const allUsers = await db.getUsers();
      setTechnicians(allUsers.filter((u) => u.role === "technician"));
      setAdmins(allUsers.filter((u) => u.role === "admin" || u.role === "dispatcher"));
      setTechStatuses(await db.getTechStatuses());

      const logs = await db.getHistory();
      const sortedLogs = [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setHistoryLogs(sortedLogs);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("cts_db_updated", loadData);
    return () => window.removeEventListener("cts_db_updated", loadData);
  }, []);

  // Technician CRUD Handlers
  const handleAddTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim() || !newTechEmail.trim() || !newTechPhone.trim()) {
      alert("Please fill in all technician details");
      return;
    }

    try {
      const allTechStatuses = await db.getTechStatuses();

      const newId = `tech-${Date.now()}`;
      const newUser: User = {
        id: newId,
        name: newTechName.trim(),
        email: newTechEmail.trim(),
        role: "technician",
        phone: newTechPhone.trim(),
        status: "active",
        department: newTechDept,
        createdAt: new Date().toISOString()
      };

      const deptStatuses = allTechStatuses.filter((s) => s.department === newTechDept);
      const maxPos = deptStatuses.length > 0 ? Math.max(...deptStatuses.map((s) => s.rotationPosition)) : 0;

      const newStatus: TechnicianStatus = {
        userId: newId,
        currentStatus: "available",
        department: newTechDept,
        rotationPosition: maxPos + 1
      };

      await db.createUser(newUser);
      await db.saveTechStatuses([...allTechStatuses, newStatus]);

      // Reset
      setNewTechName("");
      setNewTechEmail("");
      setNewTechPhone("");
      setShowAddTechModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add technician");
    }
  };

  const handleOpenEditTech = (tech: User) => {
    setShowEditTechId(tech.id);
    setEditTechName(tech.name);
    setEditTechEmail(tech.email);
    setEditTechPhone(tech.phone);
    setEditTechDept(tech.department);
  };

  const handleEditTechnicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditTechId) return;

    try {
      const allUsers = await db.getUsers();
      const user = allUsers.find((u) => u.id === showEditTechId);
      if (!user) return;

      const updatedUser: User = {
        ...user,
        name: editTechName.trim(),
        email: editTechEmail.trim(),
        phone: editTechPhone.trim(),
        department: editTechDept
      };

      await db.updateUser(updatedUser);

      // Also update department in tech_statuses if changed
      const allTechStatuses = await db.getTechStatuses();
      const tsIdx = allTechStatuses.findIndex((s) => s.userId === showEditTechId);
      if (tsIdx !== -1 && allTechStatuses[tsIdx].department !== editTechDept) {
        allTechStatuses[tsIdx].department = editTechDept;
        // Recalculate rotation position for new department
        const deptStatuses = allTechStatuses.filter((s) => s.department === editTechDept && s.userId !== showEditTechId);
        const maxPos = deptStatuses.length > 0 ? Math.max(...deptStatuses.map((s) => s.rotationPosition)) : 0;
        allTechStatuses[tsIdx].rotationPosition = maxPos + 1;
        await db.saveTechStatuses(allTechStatuses);
      }

      setShowEditTechId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to edit technician");
    }
  };

  const handleDeleteTechConfirm = async () => {
    if (!confirmDeleteTechId) return;
    try {
      const res = await db.deleteTechnician(confirmDeleteTechId);
      if (res.success) {
        setConfirmDeleteTechId(null);
        await loadData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete technician");
    }
  };

  // Admin CRUD Handlers
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPhone.trim()) {
      alert("Please fill in all admin details");
      return;
    }

    try {
      const newId = `admin-${Date.now()}`;
      const newUser: User = {
        id: newId,
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        role: "admin",
        phone: newAdminPhone.trim(),
        status: "active",
        department: "Operations",
        createdAt: new Date().toISOString()
      };

      await db.createUser(newUser);

      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPhone("");
      setShowAddAdminModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create administrator");
    }
  };

  const handleDeleteAdminConfirm = async () => {
    if (!confirmDeleteAdminId) return;
    if (confirmDeleteAdminId === currentUser.id) {
      alert("Security Constraint: You cannot remove your own administrator account.");
      setConfirmDeleteAdminId(null);
      return;
    }

    try {
      const res = await db.deleteAdmin(confirmDeleteAdminId);
      if (res.success) {
        setConfirmDeleteAdminId(null);
        await loadData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete admin");
    }
  };

  // Technician Leave / Status actions
  const handleToggleTechLeave = async (techId: string, currentStatus: TechStatus) => {
    try {
      const res = await toggleTechnicianLeave(techId, currentStatus);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manual & Auto assignment handlers
  const handleManualReassign = async (tokenId: string, techId: string) => {
    try {
      const res = await manualAssignToken(tokenId, techId, currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
      if (res.success) {
        await loadData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerAutoAssign = async (tokenId: string) => {
    try {
      const res = await autoAssignToken(tokenId);
      alert(res.message);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, tokenId: string) => {
    e.dataTransfer.setData("text/plain", tokenId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatuses: string[]) => {
    e.preventDefault();
    const tokenId = e.dataTransfer.getData("text/plain");
    if (!tokenId) return;

    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    if (targetStatuses.includes(token.status)) return;

    const newStatus = targetStatuses[0] as TokenStatus;

    try {
      if (newStatus === "ON_HOLD") {
        setHoldModalTokenId(tokenId);
        setHoldReason("");
      } else if (newStatus === "RESOLVED") {
        setResolveModalTokenId(tokenId);
        setResolveNote("");
      } else if (newStatus === "NEW" || newStatus === "SUBMITTED") {
        await updateTokenStatus(tokenId, "NEW", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
        await loadData();
      } else if (newStatus === "ASSIGNED") {
        if (token.assignedTo) {
          await updateTokenStatus(tokenId, "ASSIGNED", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
          await loadData();
        } else {
          setAssignModalTokenId(tokenId);
        }
      } else if (newStatus === "IN_PROGRESS") {
        if (!token.assignedTo) {
          setAssignModalTokenId(tokenId);
          return;
        }
        await updateTokenStatus(tokenId, "IN_PROGRESS", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
        await loadData();
      } else if (newStatus === "VERIFIED_CLOSED") {
        await updateTokenStatus(tokenId, "VERIFIED_CLOSED", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHoldConfirm = async () => {
    if (!holdModalTokenId || !holdReason.trim()) return;
    try {
      await updateTokenStatus(holdModalTokenId, "ON_HOLD", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role, { holdReason: holdReason.trim() });
      setHoldModalTokenId(null);
      setHoldReason("");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveConfirm = async () => {
    if (!resolveModalTokenId || !resolveNote.trim()) return;
    try {
      await updateTokenStatus(resolveModalTokenId, "RESOLVED", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role, { resolutionNote: resolveNote.trim() });
      setResolveModalTokenId(null);
      setResolveNote("");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSelect = async (techId: string) => {
    if (!assignModalTokenId) return;
    try {
      await manualAssignToken(assignModalTokenId, techId, currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
      setAssignModalTokenId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Detailed Complaint Management handlers
  const handleOpenManageModal = (token: Token) => {
    setShowManageTokenId(token.id);
    setEditTokenCategory(token.category);
    setEditTokenDesc(token.description);
    setEditTokenPriority(token.priority);
    setEditTokenDept(token.department);
    setIsEditingToken(false);
  };

  const handleUpdateComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showManageTokenId) return;

    try {
      const token = tokens.find((t) => t.id === showManageTokenId);
      if (!token) return;

      const updatedToken = {
        ...token,
        category: editTokenCategory,
        description: editTokenDesc,
        priority: editTokenPriority,
        department: editTokenDept,
        updatedAt: new Date().toISOString()
      };

      await db.saveTokens(tokens.map((t) => t.id === token.id ? updatedToken : t));
      setIsEditingToken(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update complaint");
    }
  };

  const handleDeleteTokenConfirm = async () => {
    if (!confirmDeleteTokenId) return;
    try {
      const res = await db.deleteToken(confirmDeleteTokenId);
      if (res.success) {
        setConfirmDeleteTokenId(null);
        setShowManageTokenId(null);
        await loadData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete ticket");
    }
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

  // Helper for department, priority, SLA and query filtering
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const matchesDept = selectedDeptFilter === "All" || t.department === selectedDeptFilter;
      const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;

      // SLA Filter calculation
      let matchesSla = true;
      const isClosed = ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status);
      const remainingMs = new Date(t.slaDueAt).getTime() - Date.now();

      if (slaFilter === "Breached") {
        matchesSla = !isClosed && remainingMs <= 0;
      } else if (slaFilter === "Imminent") {
        matchesSla = !isClosed && remainingMs > 0 && remainingMs < 2 * 3600 * 1000;
      } else if (slaFilter === "Normal") {
        matchesSla = isClosed || remainingMs >= 2 * 3600 * 1000;
      }

      const matchesSearch =
        t.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.complainantName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDept && matchesPriority && matchesSla && matchesSearch;
    });
  }, [tokens, selectedDeptFilter, priorityFilter, slaFilter, searchQuery]);

  // Calculate stats for Dashboard Header
  const openTokens = tokens.filter((t) => ["SUBMITTED", "NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status));
  const slaBreachedTokens = openTokens.filter((t) => new Date(t.slaDueAt) < new Date());

  // Kanban columns configuration
  const COLUMNS = [
    { title: "Submitted / New", status: ["SUBMITTED", "NEW"], color: "slate", icon: <Layers size={14} className="text-slate-400" /> },
    { title: "Assigned Rota", status: ["ASSIGNED"], color: "blue", icon: <UserCheck size={14} className="text-blue-500" /> },
    { title: "In Progress", status: ["IN_PROGRESS"], color: "purple", icon: <Activity size={14} className="text-purple-500" /> },
    { title: "On Hold / Paused", status: ["ON_HOLD"], color: "amber", icon: <Clock size={14} className="text-amber-500" /> },
    { title: "Resolved / Complete", status: ["RESOLVED", "VERIFIED_CLOSED"], color: "emerald", icon: <CheckCircle size={14} className="text-emerald-500" /> }
  ];

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return {
          border: "border-l-4 border-l-rose-500",
          glow: "hover:shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10",
          badge: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20"
        };
      case "HIGH":
        return {
          border: "border-l-4 border-l-amber-500",
          glow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10",
          badge: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20"
        };
      case "MEDIUM":
        return {
          border: "border-l-4 border-l-blue-500",
          glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10 bg-blue-500/5 dark:bg-blue-950/10",
          badge: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20"
        };
      default:
        return {
          border: "border-l-4 border-l-slate-400",
          glow: "hover:shadow-[0_0_15px_rgba(148,163,184,0.1)] ring-1 ring-slate-400/10 bg-slate-500/5 dark:bg-slate-900/10",
          badge: "bg-slate-500/10 text-slate-400 dark:bg-slate-500/20"
        };
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

  const getSlaProgressPercentage = (createdAt: string, dueAt: string) => {
    const total = new Date(dueAt).getTime() - new Date(createdAt).getTime();
    const elapsed = Date.now() - new Date(createdAt).getTime();
    if (total <= 0) return 100;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const getSlaProgressColor = (pct: number, isOverdue: boolean) => {
    if (isOverdue) return "bg-rose-500";
    if (pct > 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className={`mx-auto px-4 py-8 transition-all ${boardLayout === "wide" ? "max-w-[98%]" : "max-w-7xl"}`}>
      {/* Admin Title Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800/80 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-500 p-1.5 rounded-lg border border-blue-500/20">
              <Shield size={18} />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Command & Dispatch Dashboard
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Logged in: <span className="text-blue-500 font-semibold">{currentUser.name} ({currentUser.role})</span> · Control all tickets, route SLA workloads, and manage rosters.
          </p>
        </div>

        {/* Global Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveSubTab("board")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === "board"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              <Activity size={14} /> Kanban Board
            </button>
            <button
              onClick={() => setActiveSubTab("roster")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === "roster"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              <Users size={14} /> Staff Roster
            </button>
            <button
              onClick={() => setActiveSubTab("audit")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === "audit"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              <History size={14} /> Audit Trail
            </button>
            <button
              onClick={() => setActiveSubTab("reports")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === "reports"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              <BarChart3 size={14} /> Analytics
            </button>
          </div>

          <button
            onClick={loadData}
            title="Reload Console Data"
            className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* SLA Alert panel for open tickets */}
      {slaBreachedTokens.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-4 mb-6 shadow-md flex items-center gap-3.5">
          <AlertTriangle className="shrink-0 animate-bounce" size={22} />
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
            {/* Advanced Filters Block */}
            <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Advanced Filters</span>
                </div>
                {/* Board View Settings */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200/60 dark:border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold px-1 select-none">LAYOUT:</span>
                  <button
                    onClick={() => setBoardLayout(boardLayout === "standard" ? "wide" : "standard")}
                    className={`px-2 py-1 rounded font-bold transition-all ${boardLayout === "wide" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-250"}`}
                  >
                    Wide
                  </button>
                  <button
                    onClick={() => setBoardDensity(boardDensity === "detailed" ? "compact" : "detailed")}
                    className={`px-2 py-1 rounded font-bold transition-all ${boardDensity === "compact" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-250"}`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Department Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg p-2.5 outline-none cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    <option value="IT Helpdesk">IT Helpdesk</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg p-2.5 outline-none cursor-pointer"
                  >
                    <option value="All">All Priorities</option>
                    <option value="CRITICAL">Critical Only</option>
                    <option value="HIGH">High Only</option>
                    <option value="MEDIUM">Medium Only</option>
                    <option value="LOW">Low Only</option>
                  </select>
                </div>

                {/* SLA Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">SLA Status</label>
                  <select
                    value={slaFilter}
                    onChange={(e) => setSlaFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg p-2.5 outline-none cursor-pointer"
                  >
                    <option value="All">All Deadlines</option>
                    <option value="Breached">Breached (Overdue)</option>
                    <option value="Imminent">Escalation Imminent (&lt;2h)</option>
                    <option value="Normal">Within SLA Limits</option>
                  </select>
                </div>

                {/* Search query */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Search</label>
                  <input
                    type="text"
                    placeholder="Search by ID, Category, Description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg p-2.5 outline-none placeholder-slate-450"
                  />
                </div>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 pb-6 overflow-x-auto min-h-[65vh]">
              {COLUMNS.map((col) => {
                const columnTokens = filteredTokens.filter((t) => col.status.includes(t.status));

                return (
                  <div
                    key={col.title}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.status)}
                    className="bg-[#1e293b]/5 dark:bg-[#0f172a]/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 min-w-[280px] xl:max-h-[75vh] xl:overflow-y-auto transition-all"
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        {col.icon}
                        <span className="text-xs font-extrabold text-slate-850 dark:text-slate-205">
                          {col.title}
                        </span>
                      </div>
                      <span className="bg-slate-200/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                        {columnTokens.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="flex flex-col gap-3">
                      {columnTokens.map((token) => {
                        const remainingMs = new Date(token.slaDueAt).getTime() - Date.now();
                        const isSlaBreached = remainingMs <= 0 && !["RESOLVED", "VERIFIED_CLOSED"].includes(token.status);
                        const assignedTech = technicians.find((t) => t.id === token.assignedTo);

                        const slaPct = getSlaProgressPercentage(token.createdAt, token.slaDueAt);
                        const prColors = getPriorityColors(token.priority);

                        return (
                          <div
                            key={token.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, token.id)}
                            onClick={() => handleOpenManageModal(token)}
                            className={`bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col gap-3 shadow hover:shadow-lg cursor-pointer active:cursor-grabbing hover:scale-[1.015] transition-all relative ${prColors.border} ${prColors.glow} ${isSlaBreached ? "ring-1 ring-rose-500/40" : ""}`}
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-455 block uppercase tracking-wider">
                                  {token.trackingId}
                                </span>
                                <span className="text-xs font-extrabold text-slate-850 dark:text-slate-200 block mt-0.5 leading-snug">
                                  {token.category}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${prColors.badge}`}>
                                {token.priority}
                              </span>
                            </div>

                            {/* Detailed layout features */}
                            {boardDensity === "detailed" && (
                              <>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2 font-semibold">
                                  {token.description}
                                </p>

                                {/* SLA Progress Bar */}
                                {!["RESOLVED", "VERIFIED_CLOSED"].includes(token.status) && (
                                  <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex justify-between text-[8px] font-bold text-slate-450">
                                      <span>SLA PROGRESS</span>
                                      <span>{Math.round(slaPct)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/20">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${getSlaProgressColor(slaPct, isSlaBreached)}`}
                                        style={{ width: `${slaPct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Details (Tech assigned / SLA due) */}
                            <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-450">Complainant:</span>
                                <span className="font-bold text-slate-650 dark:text-slate-300 truncate max-w-[120px]">{token.complainantName}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <SlaTimer dueAt={token.slaDueAt} isResolvedOrClosed={["RESOLVED", "VERIFIED_CLOSED"].includes(token.status)} />

                                {token.assignedTo ? (
                                  <div className="flex items-center gap-1 text-[10px] text-blue-500 font-extrabold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 max-w-[110px] truncate">
                                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full shrink-0" />
                                    {assignedTech?.name || "Tech"}
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerAutoAssign(token.id);
                                    }}
                                    className="bg-blue-650 hover:bg-blue-700 text-white font-extrabold text-[9px] px-2 py-1 rounded flex items-center gap-1 transition-colors shadow"
                                  >
                                    <Shuffle size={8} /> Auto Assign
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {columnTokens.length === 0 && (
                        <div className="text-center py-8 text-[10px] text-slate-500 dark:text-slate-500 font-bold border-2 border-dashed border-slate-205/50 dark:border-slate-850 rounded-2xl select-none">
                          DRAG INCIDENTS HERE
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
              <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setRosterType("technicians")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${rosterType === "technicians"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                >
                  <Briefcase size={13} /> Rota Technicians ({technicians.length})
                </button>
                <button
                  onClick={() => setRosterType("admins")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${rosterType === "admins"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                >
                  <Shield size={13} /> Administrators ({admins.length})
                </button>
              </div>

              {rosterType === "technicians" ? (
                <button
                  onClick={() => setShowAddTechModal(true)}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Plus size={14} /> Add Technician
                </button>
              ) : (
                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Shield size={14} className="text-white" /> Create Admin
                </button>
              )}
            </div>

            {/* Sub-tab view: Technicians list */}
            {rosterType === "technicians" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {technicians.map((tech) => {
                  const statusObj = techStatuses.find((s) => s.userId === tech.id);
                  const currentStatus = statusObj ? statusObj.currentStatus : "available";
                  const rotationPos = statusObj ? statusObj.rotationPosition : 0;

                  const techTokens = tokens.filter((t) => t.assignedTo === tech.id);
                  const busyCount = techTokens.filter((t) => ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)).length;
                  const closedCount = techTokens.filter((t) => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length;

                  return (
                    <div
                      key={tech.id}
                      className={`bg-white dark:bg-[#0b0f19] border rounded-2xl p-5 shadow-md flex flex-col gap-4 relative transition-all hover:shadow-lg ${currentStatus === "resigned"
                        ? "border-slate-200 dark:border-slate-900 opacity-60"
                        : "border-slate-200 dark:border-slate-800/80 hover:border-slate-500/30"
                        }`}
                    >
                      {/* Tech Details */}
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 bg-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center font-extrabold text-sm select-none">
                          {tech.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h4 className="text-sm font-extrabold text-slate-805 dark:text-slate-100 flex items-center gap-2 truncate">
                            {tech.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {tech.department} • Position {rotationPos}
                          </span>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setShowTechDetailsId(tech.id)}
                            title="See Details"
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEditTech(tech)}
                            title="Edit Info"
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 rounded-lg transition-colors"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteTechId(tech.id)}
                            title="Delete Technician"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Stats strip */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-200/60 dark:border-slate-805/65 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase font-bold block">Status</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold block mt-1 leading-normal ${getTechStatusBadgeClass(currentStatus)}`}>
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
                        <div className="flex gap-2 mt-1 border-t border-slate-100 dark:border-slate-800/60 pt-3.5">
                          <button
                            onClick={() => handleToggleTechLeave(tech.id, currentStatus)}
                            className={`flex-grow py-1.5 px-3.5 text-[10px] font-bold rounded-lg border transition-colors ${currentStatus === "on_leave"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                              }`}
                          >
                            {currentStatus === "on_leave" ? (
                              <span className="flex items-center justify-center gap-1"><UserCheck size={11} /> End Leave</span>
                            ) : (
                              <span className="flex items-center justify-center gap-1"><CalendarDays size={11} /> Set Leave</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-tab view: Administrators list */}
            {rosterType === "admins" && (
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800/60">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Helpdesk Admin Staff</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">Administrators and Dispatchers with access to the Command Console.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold bg-slate-50 dark:bg-slate-900/40">
                        <th className="p-4">Name</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone Contact (Password)</th>
                        <th className="p-4">Joined Date</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                      {admins.map((adm) => {
                        const isSelf = adm.id === currentUser.id;
                        return (
                          <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/10">
                            <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-extrabold uppercase">{adm.name.charAt(0)}</span>
                              {adm.name} {isSelf && <span className="badge-blue text-[8px] font-extrabold uppercase py-0 px-1 ml-1.5">You</span>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${adm.role === "admin" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                                {adm.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{adm.email}</td>
                            <td className="p-4 font-medium text-slate-500 dark:text-slate-400">{adm.phone}</td>
                            <td className="p-4 text-slate-400 font-medium">
                              {new Date(adm.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setConfirmDeleteAdminId(adm.id)}
                                disabled={isSelf}
                                title={isSelf ? "Self-deletion disabled" : "Remove administrator"}
                                className={`p-1.5 rounded-lg transition-colors ${isSelf
                                  ? "text-slate-300 dark:text-slate-805 cursor-not-allowed"
                                  : "text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                  }`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Append-only log system recording all state modifications.</p>
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
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50 dark:bg-slate-900/10">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Token ID</th>
                    <th className="p-3">Transition</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 text-slate-400 font-bold whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 text-blue-500 font-extrabold">{log.tokenId.slice(0, 10)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-200 dark:border-slate-800">
                          {log.fromStatus} → {log.toStatus}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {log.actorName} <span className="text-[9px] uppercase font-bold text-slate-500">({log.actorRole})</span>
                      </td>
                      <td className="p-3 text-xs italic font-medium max-w-sm truncate text-slate-450">
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
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-805 p-5 rounded-2xl shadow flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Tickets Created</span>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">{tokens.length}</span>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Activity size={24} />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-805 p-5 rounded-2xl shadow flex items-center justify-between">
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

              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-805 p-5 rounded-2xl shadow flex items-center justify-between">
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
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-350">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                      {technicians.map((tech) => {
                        const techTokens = tokens.filter(t => t.assignedTo === tech.id);
                        const closed = techTokens.filter(t => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)).length;
                        const rated = techTokens.filter(t => t.rating !== undefined);
                        const avgRating = rated.length > 0
                          ? (rated.reduce((acc, t) => acc + (t.rating || 0), 0) / rated.length).toFixed(1)
                          : "N/A";

                        return (
                          <tr key={tech.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/10">
                            <td className="py-2.5 pr-4 text-slate-850 dark:text-slate-100">{tech.name}</td>
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
                <input type="text" required placeholder="e.g. Technician A" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Email Address</label>
                <input type="email" required placeholder="e.g. technician A@aai.aero" value={newTechEmail} onChange={(e) => setNewTechEmail(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Phone Contact (Acts as password)</label>
                <input type="text" required placeholder="e.g. +918221838347" value={newTechPhone} onChange={(e) => setNewTechPhone(e.target.value)} className="input text-xs" />
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

      {/* Edit Technician Modal */}
      {showEditTechId && (() => {
        return (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditTechId(null); }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit Technician Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify core details. The phone contact acts as their password key.</p>
                </div>
                <button onClick={() => setShowEditTechId(null)} className="btn-icon" aria-label="Close"><X size={16} /></button>
              </div>

              <form onSubmit={handleEditTechnicianSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="input-label">Name</label>
                  <input type="text" required value={editTechName} onChange={(e) => setEditTechName(e.target.value)} className="input text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="input-label">Email Address</label>
                  <input type="email" required value={editTechEmail} onChange={(e) => setEditTechEmail(e.target.value)} className="input text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="input-label">Phone Contact (Password)</label>
                  <input type="text" required value={editTechPhone} onChange={(e) => setEditTechPhone(e.target.value)} className="input text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="input-label">Department</label>
                  <select value={editTechDept} onChange={(e) => setEditTechDept(e.target.value)} className="input text-xs cursor-pointer">
                    <option value="IT Helpdesk">IT Helpdesk</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button type="button" onClick={() => setShowEditTechId(null)} className="btn-secondary text-xs">Cancel</button>
                  <button type="submit" className="btn-primary text-xs">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        );
      })()}

      {/* Technician Details Modal */}
      {showTechDetailsId && (() => {
        const tech = technicians.find((t) => t.id === showTechDetailsId);
        if (!tech) return null;
        const tsObj = techStatuses.find((s) => s.userId === tech.id);
        const currentStatus = tsObj ? tsObj.currentStatus : "available";
        const rotationPos = tsObj ? tsObj.rotationPosition : 0;

        const techTokens = tokens.filter((t) => t.assignedTo === tech.id);
        const openTokens = techTokens.filter((t) => ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status));
        const closedTokens = techTokens.filter((t) => ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status));
        const ratedTokens = techTokens.filter((t) => t.rating !== undefined);
        const avgRating = ratedTokens.length > 0
          ? (ratedTokens.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTokens.length).toFixed(1)
          : "No ratings yet";

        return (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTechDetailsId(null); }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-lg">
              <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center font-extrabold text-lg">
                    {tech.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{tech.name}</h3>
                    <span className="text-xs text-slate-450 font-semibold">{tech.department} Technician</span>
                  </div>
                </div>
                <button onClick={() => setShowTechDetailsId(null)} className="btn-icon" aria-label="Close"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 text-xs font-semibold">
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Email Address</span>
                  <span className="text-slate-700 dark:text-slate-200 mt-1 block truncate">{tech.email}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Mobile Number (Password)</span>
                  <span className="text-slate-700 dark:text-slate-200 mt-1 block">{tech.phone}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-855">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Duty Rota Status</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block mt-2 ${getTechStatusBadgeClass(currentStatus)}`}>
                    {currentStatus.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-855">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Rotation Position</span>
                  <span className="text-slate-700 dark:text-slate-200 mt-1 block">Pos {rotationPos}</span>
                </div>
              </div>

              {/* Rota Performance Metrics */}
              <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4 mt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Rota Performance Metrics</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Active Tickets</span>
                    <span className="text-xl font-extrabold text-blue-500 mt-1 block">{openTokens.length}</span>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Resolved Tickets</span>
                    <span className="text-xl font-extrabold text-emerald-500 mt-1 block">{closedTokens.length}</span>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Avg Satisfaction</span>
                    <span className="text-xl font-extrabold text-amber-500 mt-1 block flex items-center justify-center gap-1">
                      <Star size={14} className="fill-amber-500 text-amber-500 inline" /> {avgRating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Assignments list */}
              {openTokens.length > 0 && (
                <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4 mt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Assignments</h4>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto">
                    {openTokens.map((tok) => (
                      <div key={tok.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-850 p-2.5 rounded-xl text-[10px] font-semibold">
                        <div>
                          <span className="text-blue-500 font-bold mr-2">{tok.trackingId}</span>
                          <span className="text-slate-700 dark:text-slate-200">{tok.category}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${tok.status === "IN_PROGRESS" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
                          {tok.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowTechDetailsId(null)} className="btn-primary text-xs">Close Details</button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Add Administrator Modal */}
      {showAddAdminModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddAdminModal(false); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create Administrator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure operational dashboard administrators.</p>
              </div>
              <button onClick={() => setShowAddAdminModal(false)} className="btn-icon" aria-label="Close"><X size={16} /></button>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Admin Name</label>
                <input type="text" required placeholder="e.g. Ravi Bhardwaj" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Email Address</label>
                <input type="email" required placeholder="e.g. ravi @aai.aero" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="input-label">Phone Contact (Password key)</label>
                <input type="text" required placeholder="e.g. +91123456789" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} className="input text-xs" />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setShowAddAdminModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Create Administrator</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Administrator Confirmation Modal */}
      {confirmDeleteAdminId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteAdminId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><AlertTriangle size={20} /></div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Remove Administrator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This will completely delete this administrator's credentials and dashboard access.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setConfirmDeleteAdminId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleDeleteAdminConfirm} className="btn-danger text-xs">Confirm Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Technician Confirmation Modal */}
      {confirmDeleteTechId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteTechId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><AlertTriangle size={20} /></div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Delete Technician</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to delete this technician from the roster? This deletes their status records. Any active tickets assigned to them will be returned to the <span className="font-bold">NEW</span> queue.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setConfirmDeleteTechId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleDeleteTechConfirm} className="btn-danger text-xs">Confirm Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Advanced Complaint Management Modal */}
      {showManageTokenId && (() => {
        const token = tokens.find((t) => t.id === showManageTokenId);
        if (!token) return null;

        const tokenLogs = historyLogs.filter((l) => l.tokenId === token.id);
        const eligibleTechs = technicians.filter((t) => t.status === "active"); // Let admin override to ANY active technician

        return (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !confirmDeleteTokenId) setShowManageTokenId(null); }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto">

              <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-455 uppercase tracking-wider">{token.trackingId}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-500 uppercase`}>
                      {token.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-850 dark:text-white mt-1">Manage Incident Details</h3>
                </div>
                <button onClick={() => { if (!confirmDeleteTokenId) setShowManageTokenId(null); }} className="btn-icon" aria-label="Close"><X size={16} /></button>
              </div>

              {isEditingToken ? (
                // Edit Incident Details Form
                <form onSubmit={handleUpdateComplaintSubmit} className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="input-label">Category Name / Topic</label>
                    <input type="text" required value={editTokenCategory} onChange={(e) => setEditTokenCategory(e.target.value)} className="input text-xs" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="input-label">Description / Problem Statement</label>
                    <textarea rows={4} required value={editTokenDesc} onChange={(e) => setEditTokenDesc(e.target.value)} className="input text-xs resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="input-label">Workload Priority</label>
                      <select value={editTokenPriority} onChange={(e) => setEditTokenPriority(e.target.value as any)} className="input text-xs cursor-pointer">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="input-label">Operational Department</label>
                      <select value={editTokenDept} onChange={(e) => setEditTokenDept(e.target.value)} className="input text-xs cursor-pointer">
                        <option value="IT Helpdesk">IT Helpdesk</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="HVAC">HVAC</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-4">
                    <button type="button" onClick={() => setIsEditingToken(false)} className="btn-secondary text-xs">Cancel</button>
                    <button type="submit" className="btn-primary text-xs">Save Incident Changes</button>
                  </div>
                </form>
              ) : (
                // View & Control Panel
                <div className="flex flex-col gap-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-850">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Complainant Information</span>
                        <span className="text-slate-800 dark:text-slate-200 mt-1 block font-bold">{token.complainantName}</span>
                        <span className="text-slate-500 dark:text-slate-400 block mt-0.5">{token.complainantContact}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-850">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Problem Description</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">{token.description}</p>
                      </div>
                      {token.photoUrl && (
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-855 flex flex-col gap-2">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Attached Image / File Preview</span>
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-60 mt-1">
                            <img src={token.photoUrl} className="w-full object-contain max-h-60" alt="Complainant attachment" />
                          </div>
                          <a href={token.photoUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline mt-1 inline-block">
                            Open Original Attachment Link
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-850">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Operations Department & Priority</span>
                        <span className="text-slate-800 dark:text-slate-200 mt-1 block font-bold">{token.department}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase inline-block mt-1.5 ${getPriorityColors(token.priority).badge}`}>
                          {token.priority} Priority
                        </span>
                      </div>

                      {/* SLA Status indicator */}
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-850 flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">SLA Milestone</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-slate-500 dark:text-slate-400">Time Limit:</span>
                          <SlaTimer dueAt={token.slaDueAt} isResolvedOrClosed={["RESOLVED", "VERIFIED_CLOSED"].includes(token.status)} />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Due by: {new Date(token.slaDueAt).toLocaleString()}</span>
                      </div>

                      {/* Manual Assignment Override (Assign to anyone) */}
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-105 dark:border-slate-850 flex flex-col gap-2">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Assignee Override</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={token.assignedTo || ""}
                            onChange={(e) => handleManualReassign(token.id, e.target.value)}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg p-2 flex-grow outline-none cursor-pointer"
                          >
                            <option value="">-- Unassigned / Queue --</option>
                            {eligibleTechs.map((tech) => (
                              <option key={tech.id} value={tech.id}>
                                {tech.name} ({tech.department})
                              </option>
                            ))}
                          </select>
                          {token.assignedTo && (
                            <button
                              onClick={async () => {
                                try {
                                  await updateTokenStatus(token.id, "NEW", currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
                                  await loadData();
                                } catch (e) { console.error(e); }
                              }}
                              className="py-2 px-2.5 bg-slate-150 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 rounded-lg text-xs transition-colors"
                              title="Clear assignee"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resolution details if exists */}
                  {["RESOLVED", "VERIFIED_CLOSED"].includes(token.status) && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl text-xs font-semibold">
                      <span className="text-[9px] text-emerald-605 dark:text-emerald-400 font-bold block uppercase">Resolution Details</span>
                      <p className="text-slate-700 dark:text-slate-350 mt-1 italic">"{token.resolutionNote || "No notes entered."}"</p>
                      {token.resolvedAt && <span className="text-[9px] text-slate-400 mt-1.5 block">Resolved at: {new Date(token.resolvedAt).toLocaleString()}</span>}
                    </div>
                  )}

                  {/* Rating / feedback details if exists */}
                  {token.status === "VERIFIED_CLOSED" && token.rating && (
                    <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl text-xs font-semibold flex flex-col gap-1.5">
                      <span className="text-[9px] text-amber-500 font-bold block uppercase">Complainant Satisfaction Feedback</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Rating:</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={11} className={`${i < (token.rating || 0) ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-slate-800"}`} />
                          ))}
                        </div>
                      </div>
                      {token.ratingComment && <p className="text-slate-700 dark:text-slate-355 italic mt-0.5">"{token.ratingComment}"</p>}
                    </div>
                  )}

                  {/* Status transitions control bar */}
                  <div className="border-t border-slate-150 dark:border-slate-800 pt-4">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-2.5">Console Status Transitions</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { status: "NEW", label: "Reset to New", color: "btn-secondary text-[10px]" },
                        { status: "ASSIGNED", label: "Set Assigned", color: "btn-secondary text-[10px]" },
                        { status: "IN_PROGRESS", label: "In Progress", color: "btn-secondary text-[10px]" },
                        { status: "ON_HOLD", label: "Pause (Hold)", color: "btn-secondary text-[10px] text-amber-500" },
                        { status: "RESOLVED", label: "Complete (Resolve)", color: "btn-secondary text-[10px] text-emerald-500" },
                        { status: "VERIFIED_CLOSED", label: "Verify & Close", color: "btn-secondary text-[10px] text-emerald-600" }
                      ].map((st) => {
                        const isCurrent = token.status === st.status;
                        return (
                          <button
                            key={st.status}
                            disabled={isCurrent}
                            onClick={async () => {
                              try {
                                if (st.status === "ON_HOLD") {
                                  setHoldModalTokenId(token.id);
                                  setHoldReason("");
                                } else if (st.status === "RESOLVED") {
                                  setResolveModalTokenId(token.id);
                                  setResolveNote("");
                                } else {
                                  await updateTokenStatus(token.id, st.status as TokenStatus, currentUser.id, `${currentUser.name} (Admin)`, currentUser.role);
                                  await loadData();
                                }
                              } catch (e) { console.error(e); }
                            }}
                            className={`py-1.5 px-3 rounded-lg border transition-all font-bold ${isCurrent
                              ? "bg-slate-100 dark:bg-slate-900 text-slate-455 border-slate-200/50 dark:border-slate-850 cursor-not-allowed"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:text-blue-500"
                              }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit trail específico de este token */}
                  <div className="border-t border-slate-150 dark:border-slate-800 pt-4">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-2.5">Incident Activity Log</span>
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto text-[10px]">
                      {tokenLogs.length === 0 ? (
                        <p className="text-slate-400 py-2 italic font-semibold">No activity logs recorded for this ticket.</p>
                      ) : (
                        tokenLogs.map((log) => (
                          <div key={log.id} className="flex gap-2.5 bg-slate-50/60 dark:bg-slate-900/10 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
                            <span className="text-slate-400 font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <div className="flex-grow">
                              <div className="font-bold text-slate-800 dark:text-slate-350">
                                {log.fromStatus} → {log.toStatus} by <span className="text-blue-500">{log.actorName}</span>
                              </div>
                              {log.note && <p className="text-[9px] text-slate-500 mt-0.5 italic">"{log.note}"</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Danger Zone: Delete Ticket */}
                  <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4 mt-2 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                    <span className="text-[10px] text-rose-500 font-bold block uppercase tracking-wider mb-1">Danger Zone</span>
                    <p className="text-[10px] text-slate-450 font-medium mb-3">Permanently delete this incident ticket and all related logs. This action is irreversible.</p>
                    {confirmDeleteTokenId ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-rose-500 font-bold">Are you absolutely sure?</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmDeleteTokenId(null)} className="py-1 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                          <button type="button" onClick={handleDeleteTokenConfirm} className="py-1 px-3 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700">Delete Ticket</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTokenId(token.id)}
                        className="py-1.5 px-3 border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 size={13} /> Delete Complaint Ticket
                      </button>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex gap-3 justify-end mt-4 border-t border-slate-150 dark:border-slate-800 pt-4">
                    <button type="button" onClick={() => { setIsEditingToken(true); }} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Edit size={13} /> Edit Details
                    </button>
                    <button type="button" onClick={() => setShowManageTokenId(null)} className="btn-primary text-xs">Close Console</button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        );
      })()}

      {/* Hold Reason Modal (Kanban drag / action) */}
      {holdModalTokenId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setHoldModalTokenId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Hold Reason Required</h3>
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="input-label">Block Reason</label>
              <textarea rows={3} required placeholder="Why is this ticket being put on hold?" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="input text-xs resize-none" />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setHoldModalTokenId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleHoldConfirm} disabled={!holdReason.trim()} className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 shadow-amber-600/20">Confirm Hold</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Resolve Note Modal (Kanban drag / action) */}
      {resolveModalTokenId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setResolveModalTokenId(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Resolution Notes Required</h3>
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="input-label">Resolution Explanation</label>
              <textarea rows={3} required placeholder="Describe how the issue was resolved..." value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="input text-xs resize-none" />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setResolveModalTokenId(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleResolveConfirm} disabled={!resolveNote.trim()} className="btn-success text-xs">Submit Resolution</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Assign Technician Modal (Kanban drag / action) */}
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
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-500">No active technicians in this department.</p>
                  <button
                    onClick={() => {
                      setAssignModalTokenId(null);
                      if (token) handleOpenManageModal(token);
                    }}
                    className="mt-3 py-1.5 px-3 bg-blue-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Bypass Department Matching
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-4">
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
                            <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{tech.name}</span>
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
