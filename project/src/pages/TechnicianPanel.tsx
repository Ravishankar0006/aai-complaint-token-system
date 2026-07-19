import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  History,
  TrendingUp,
  Star,
  Play,
  Pause,
  Check,
  Power,
  Calendar,
  AlertTriangle,
  Camera,
  CornerDownRight,
  User,
  Phone,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { db, updateTokenStatus, toggleTechnicianLeave } from "../db/mockDb";
import { SlaTimer } from "../components/SlaTimer";
import { Token, TechnicianStatus, User as UserType } from "../types";

interface TechnicianPanelProps {
  techId: string;
}

export function TechnicianPanel({ techId }: TechnicianPanelProps) {
  const [techUser, setTechUser] = useState<UserType | null>(null);
  const [techStatus, setTechStatus] = useState<TechnicianStatus | null>(null);
  const [activeQueue, setActiveQueue] = useState<Token[]>([]);
  const [historyQueue, setHistoryQueue] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");

  // Hold Modal States
  const [showHoldModal, setShowHoldModal] = useState<Token | null>(null);
  const [holdReason, setHoldReason] = useState("");

  // Resolve Modal States
  const [showResolveModal, setShowResolveModal] = useState<Token | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);

  // Selected Token Details Modal State
  const [selectedTokenDetails, setSelectedTokenDetails] = useState<Token | null>(null);

  // Load tech stats and lists
  const loadData = async () => {
    try {
      const users = await db.getUsers();
      const statuses = await db.getTechStatuses();
      const tokens = await db.getTokens();

      const currentUser = users.find((u) => u.id === techId) || null;
      const currentStatus = statuses.find((s) => s.userId === techId) || null;

      setTechUser(currentUser);
      setTechStatus(currentStatus);

      if (currentUser) {
        const active = tokens.filter(
          (t) =>
            t.assignedTo === techId &&
            ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
        );
        // Sort: CRITICAL -> HIGH -> MEDIUM -> LOW
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const sortedActive = [...active].sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        setActiveQueue(sortedActive);

        const resolved = tokens.filter(
          (t) =>
            t.assignedTo === techId &&
            ["RESOLVED", "VERIFIED_CLOSED"].includes(t.status)
        );
        const sortedResolved = [...resolved].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setHistoryQueue(sortedResolved);
      }
    } catch (err) {
      console.error("Error loading technician data:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("cts_db_updated", loadData);
    return () => window.removeEventListener("cts_db_updated", loadData);
  }, [techId]);

  const handleToggleLeave = async () => {
    if (!techStatus || !techUser) return;
    try {
      const res = await toggleTechnicianLeave(techId, techStatus.currentStatus);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartWork = async (tokenId: string) => {
    if (!techUser) return;
    try {
      const res = await updateTokenStatus(tokenId, "IN_PROGRESS", techUser.id, techUser.name, "technician");
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePutOnHoldSubmit = async () => {
    if (!showHoldModal || !holdReason.trim() || !techUser) return;
    try {
      const res = await updateTokenStatus(
        showHoldModal.id,
        "ON_HOLD",
        techUser.id,
        techUser.name,
        "technician",
        { holdReason }
      );
      if (res.success) {
        setShowHoldModal(null);
        setHoldReason("");
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveSubmit = async () => {
    if (!showResolveModal || !resolveNote.trim() || !techUser) return;
    try {
      const res = await updateTokenStatus(
        showResolveModal.id,
        "RESOLVED",
        techUser.id,
        techUser.name,
        "technician",
        {
          resolutionNote: resolveNote,
          resolutionPhoto: resolutionPhoto || undefined
        }
      );
      if (res.success) {
        setShowResolveModal(null);
        setResolveNote("");
        setResolutionPhoto(null);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Performance calculations
  const totalClosed = historyQueue.length;
  const ratedTasks = historyQueue.filter((t) => t.rating !== undefined);
  const avgRating =
    ratedTasks.length > 0
      ? (ratedTasks.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTasks.length).toFixed(1)
      : "N/A";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-500 text-white shadow shadow-rose-500/20";
      case "HIGH":
        return "bg-amber-500 text-slate-900 font-bold shadow shadow-amber-500/10";
      case "MEDIUM":
        return "bg-blue-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "IN_PROGRESS":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/20 animate-pulse-subtle";
      case "ON_HOLD":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

  const getTechStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-500 ring-emerald-500/30";
      case "busy":
        return "bg-purple-500 ring-purple-500/30";
      case "on_leave":
        return "bg-amber-500 ring-amber-500/30";
      default:
        return "bg-slate-500 ring-slate-500/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Technician Identity Header */}
      {techUser && techStatus && (
        <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-500 font-extrabold text-lg select-none">
                {techUser.name.charAt(0)}
              </div>
              <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-950 ${getTechStatusColor(techStatus.currentStatus)}`} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {techUser.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {techUser.department} Technician • Roster Position {techStatus.rotationPosition}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800/80 pt-4 md:pt-0 md:border-0">
            {/* Status indicators */}
            <div className="flex gap-6 mr-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">Completed</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <TrendingUp size={16} className="text-emerald-500" /> {totalClosed}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">Rating</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Star size={16} className="text-amber-500 fill-amber-500" /> {avgRating}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleLeave}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                techStatus.currentStatus === "on_leave"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
              }`}
            >
              {techStatus.currentStatus === "on_leave" ? (
                <>
                  <Power size={14} /> Resume Roster Duty
                </>
              ) : (
                <>
                  <Calendar size={14} /> Mark "On Leave"
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-6">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "queue"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ListTodo size={16} /> My Active Queue ({activeQueue.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "history"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <History size={16} /> Work History ({historyQueue.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "queue" ? (
          <motion.div
            key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {activeQueue.length === 0 ? (
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center shadow-sm">
                <span className="text-3xl block mb-3">☕</span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Tickets in Queue</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You are all caught up! New tickets assigned via round-robin will appear here automatically.
                </p>
              </div>
            ) : (
              activeQueue.map((token) => (
                <div
                  key={token.id}
                  onClick={() => setSelectedTokenDetails(token)}
                  className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col gap-4 cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition-all"
                >
                  {/* Top bar info */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold tracking-wider text-slate-400">
                          {token.trackingId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getStatusBadge(token.status)}`}>
                          {token.status.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {token.category}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold ${getPriorityColor(token.priority)}`}>
                      {token.priority}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {token.description}
                  </p>

                  {/* Photo attachment if exists */}
                  {token.photoUrl && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
                      <ImageIcon size={14} className="text-blue-500" />
                      <a href={token.photoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-bold text-blue-500 hover:underline">
                        View Complainant Photo
                      </a>
                    </div>
                  )}

                  {/* Hold Reason Alert if ON_HOLD */}
                  {token.status === "ON_HOLD" && token.holdReason && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs flex gap-2">
                      <AlertTriangle className="shrink-0" size={16} />
                      <div>
                        <span className="font-bold">Ticket is Paused / On Hold:</span>
                        <p className="font-medium italic mt-0.5">"{token.holdReason}"</p>
                      </div>
                    </div>
                  )}

                  {/* Bottom bar complainant details & controls */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" /> {token.complainantName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-slate-400" /> {token.complainantContact}
                      </span>
                      <SlaTimer dueAt={token.slaDueAt} isResolvedOrClosed={["RESOLVED", "VERIFIED_CLOSED"].includes(token.status)} />
                    </div>

                    <div className="flex gap-2">
                      {token.status === "ASSIGNED" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartWork(token.id); }}
                          className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-blue-500/15"
                        >
                          <Play size={12} /> Start Work
                        </button>
                      )}

                      {token.status === "IN_PROGRESS" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowHoldModal(token); }}
                            className="py-1.5 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-500 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-800"
                          >
                            <Pause size={12} className="inline mr-1" /> Put on Hold
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowResolveModal(token); }}
                            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-emerald-600/15"
                          >
                            <Check size={12} /> Mark Resolved
                          </button>
                        </>
                      )}

                      {token.status === "ON_HOLD" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartWork(token.id); }}
                            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                          >
                            <Play size={12} /> Resume Work
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowResolveModal(token); }}
                            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                          >
                            <Check size={12} /> Mark Resolved
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {historyQueue.length === 0 ? (
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center shadow-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No History Records</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Once you resolve tasks, they will appear here as part of your weekly review.
                </p>
              </div>
            ) : (
              historyQueue.map((token) => (
                <div
                  key={token.id}
                  onClick={() => setSelectedTokenDetails(token)}
                  className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col gap-2.5 opacity-80 cursor-pointer hover:opacity-100 hover:border-slate-400 dark:hover:border-slate-705 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{token.trackingId}</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                        {token.status.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Completed: {new Date(token.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{token.category}</h4>

                  {token.resolutionNote && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-200 dark:border-slate-800/50 text-[10px] flex flex-col gap-1">
                      <span className="font-bold text-slate-400 flex items-center gap-1">
                        <CornerDownRight size={10} /> My Resolution Notes:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{token.resolutionNote}"</p>
                    </div>
                  )}

                  {/* Customer feedback if verified closed */}
                  {token.rating && (
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        Rating: {token.rating} Stars
                      </span>
                      {token.ratingComment && (
                        <span className="font-medium italic truncate max-w-[200px]">
                          "{token.ratingComment}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold Reason Modal */}
      {showHoldModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowHoldModal(null); }} role="dialog" aria-modal="true" aria-label="Put token on hold">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Put Token On Hold</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please provide a valid block reason (mandatory).</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Hold Block Reason</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Waiting for spare RJ45 crimper / motherboard from central stores."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowHoldModal(null)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePutOnHoldSubmit}
                disabled={!holdReason.trim()}
                className="py-2 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-slate-900 font-bold text-xs rounded-lg transition-colors shadow shadow-amber-600/10"
              >
                Confirm Hold
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowResolveModal(null); }} role="dialog" aria-modal="true" aria-label="Submit resolution">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Submit Resolution Notes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please provide resolution proof details (mandatory).</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Resolution Explanation</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Swapped motherboard, booted successfully. Terminal prints boarding passes fine now."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Attach Repair Proof Photo (Simulation)</label>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30">
                {resolutionPhoto ? (
                  <div className="relative rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-800 w-full max-w-[150px] aspect-video">
                    <img src={resolutionPhoto} className="w-full h-full object-cover" alt="resolution" />
                    <button
                      type="button"
                      onClick={() => setResolutionPhoto(null)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-1 flex flex-col items-center gap-1.5">
                    <Camera className="text-slate-400" size={24} />
                    <span className="text-[10px] text-slate-500 font-semibold">Drop mock fix screenshot</span>
                    <button
                      type="button"
                      onClick={() =>
                        setResolutionPhoto("https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80")
                      }
                      className="text-[9px] bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-1 px-2.5 rounded font-bold"
                    >
                      Add Replaced Cable Photo Mock
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowResolveModal(null)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={!resolveNote.trim()}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors shadow shadow-emerald-600/10"
              >
                Submit Resolution
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Selected Token Details Modal */}
      {selectedTokenDetails && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTokenDetails(null); }} role="dialog" aria-modal="true">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-850 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedTokenDetails.trackingId}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-500 uppercase`}>
                    {selectedTokenDetails.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mt-1">Incident Detail View</h3>
              </div>
              <button onClick={() => setSelectedTokenDetails(null)} className="btn-icon" aria-label="Close"><X size={16} /></button>
            </div>

            <div className="flex flex-col gap-4 py-4 text-xs font-semibold">
              {/* Complainant Info */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Complainant Information</span>
                <span className="text-slate-800 dark:text-slate-205 mt-1.5 block font-bold">{selectedTokenDetails.complainantName}</span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">{selectedTokenDetails.complainantContact}</span>
              </div>

              {/* Complaint details */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-855">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Incident Category</span>
                <span className="text-slate-800 dark:text-slate-200 mt-1 block font-bold">{selectedTokenDetails.category}</span>
                <span className="text-[9px] text-slate-450 mt-1.5 block font-medium">Priority: {selectedTokenDetails.priority} · Dept: {selectedTokenDetails.department}</span>
              </div>

              {/* Problem Description */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-855">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Problem Description</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed font-medium whitespace-pre-wrap">{selectedTokenDetails.description}</p>
              </div>

              {/* Image Preview */}
              {selectedTokenDetails.photoUrl && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-855 flex flex-col gap-2">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Attached Image / File Preview</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-60 mt-1">
                    <img src={selectedTokenDetails.photoUrl} className="w-full object-contain max-h-60" alt="Complainant attachment" />
                  </div>
                  <a href={selectedTokenDetails.photoUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline mt-1 inline-block">
                    Open Original Attachment Link
                  </a>
                </div>
              )}

              {/* SLA Status indicator */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">SLA Target</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500 dark:text-slate-400">Remaining Time:</span>
                  <SlaTimer dueAt={selectedTokenDetails.slaDueAt} isResolvedOrClosed={["RESOLVED", "VERIFIED_CLOSED"].includes(selectedTokenDetails.status)} />
                </div>
                <span className="text-[9px] text-slate-400 mt-1 font-medium">Due deadline: {new Date(selectedTokenDetails.slaDueAt).toLocaleString()}</span>
              </div>

              {/* Resolution details if exists */}
              {["RESOLVED", "VERIFIED_CLOSED"].includes(selectedTokenDetails.status) && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 p-3.5 rounded-xl">
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">Resolution Details</span>
                  <p className="text-slate-700 dark:text-slate-350 mt-1 italic">"{selectedTokenDetails.resolutionNote || "No notes entered."}"</p>
                  {selectedTokenDetails.resolvedAt && <span className="text-[9px] text-slate-400 mt-1.5 block">Resolved at: {new Date(selectedTokenDetails.resolvedAt).toLocaleString()}</span>}
                </div>
              )}

              {/* Rating feedback */}
              {selectedTokenDetails.status === "VERIFIED_CLOSED" && selectedTokenDetails.rating && (
                <div className="bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-xl flex flex-col gap-1.5">
                  <span className="text-[9px] text-amber-500 font-bold block uppercase">Complainant feedback rating</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Rating:</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={`${i < (selectedTokenDetails.rating || 0) ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-slate-800"}`} />
                      ))}
                    </div>
                  </div>
                  {selectedTokenDetails.ratingComment && <p className="text-slate-700 dark:text-slate-350 italic mt-0.5">"{selectedTokenDetails.ratingComment}"</p>}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-4 border-t border-slate-150 dark:border-slate-850 pt-3">
              <div className="flex gap-2">
                {selectedTokenDetails.status === "ASSIGNED" && (
                  <button
                    onClick={() => {
                      handleStartWork(selectedTokenDetails.id);
                      setSelectedTokenDetails(null);
                    }}
                    className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-blue-500/15"
                  >
                    <Play size={12} /> Start Work
                  </button>
                )}

                {selectedTokenDetails.status === "IN_PROGRESS" && (
                  <>
                    <button
                      onClick={() => {
                        setShowHoldModal(selectedTokenDetails);
                        setSelectedTokenDetails(null);
                      }}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-205 text-amber-500 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <Pause size={12} className="inline mr-1" /> Put on Hold
                    </button>
                    <button
                      onClick={() => {
                        setShowResolveModal(selectedTokenDetails);
                        setSelectedTokenDetails(null);
                      }}
                      className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-emerald-600/15"
                    >
                      <Check size={12} /> Mark Resolved
                    </button>
                  </>
                )}

                {selectedTokenDetails.status === "ON_HOLD" && (
                  <>
                    <button
                      onClick={() => {
                        handleStartWork(selectedTokenDetails.id);
                        setSelectedTokenDetails(null);
                      }}
                      className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      <Play size={12} /> Resume Work
                    </button>
                    <button
                      onClick={() => {
                        setShowResolveModal(selectedTokenDetails);
                        setSelectedTokenDetails(null);
                      }}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      <Check size={12} /> Mark Resolved
                    </button>
                  </>
                )}
              </div>
              <button onClick={() => setSelectedTokenDetails(null)} className="btn-secondary text-xs">Close View</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
