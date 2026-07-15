import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Star,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Send,
  AlertCircle
} from "lucide-react";
import { db, createComplaint, updateTokenStatus } from "../db/mockDb";
import { Token, Category, TokenHistory } from "../types";
import confetti from "canvas-confetti";

export function ComplainantPortal() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit");
  
  // Submit Form State
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [mockPhoto, setMockPhoto] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<Token | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Tracking State
  const [searchTrackingId, setSearchTrackingId] = useState("");
  const [trackedToken, setTrackedToken] = useState<Token | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenHistory[]>([]);
  const [trackError, setTrackError] = useState("");

  // Feedback/Dispute Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    setCategories(db.getCategories());
    // Auto-select first category
    const cats = db.getCategories();
    if (cats.length > 0) setCategory(cats[0].name);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMockPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMockPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!trackedToken) return;
    const handleSync = () => {
      refreshTrackedToken(trackedToken.trackingId);
    };
    window.addEventListener("cts_db_updated", handleSync);
    return () => window.removeEventListener("cts_db_updated", handleSync);
  }, [trackedToken]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !description.trim()) {
      setErrorMsg("All fields are mandatory");
      return;
    }
    setErrorMsg("");

    const photoUrl = mockPhoto || undefined;
    const res = createComplaint(name, contact, category, description, photoUrl);
    if (res.success) {
      setSubmitSuccess(res.token);
      triggerConfetti();
      // Clear fields
      setName("");
      setContact("");
      setDescription("");
      setMockPhoto(null);
    }
  };

  const handleTrack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTrackError("");
    if (!searchTrackingId.trim()) return;

    const tokens = db.getTokens();
    const token = tokens.find(
      (t) => t.trackingId.toLowerCase() === searchTrackingId.trim().toLowerCase()
    );

    if (token) {
      setTrackedToken(token);
      // Fetch history for this token
      const history = db.getHistory().filter((h) => h.tokenId === token.id);
      // Sort oldest to newest for timeline
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setTokenHistory(sortedHistory);
    } else {
      setTrackedToken(null);
      setTokenHistory([]);
      setTrackError("No ticket found with this tracking ID");
    }
  };

  // Helper to refresh current tracked token details
  const refreshTrackedToken = (tid: string) => {
    const tokens = db.getTokens();
    const token = tokens.find((t) => t.trackingId === tid);
    if (token) {
      setTrackedToken(token);
      const history = db.getHistory().filter((h) => h.tokenId === token.id);
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setTokenHistory(sortedHistory);
    }
  };

  const handleVerifyClose = () => {
    if (!trackedToken) return;
    const res = updateTokenStatus(
      trackedToken.id,
      "VERIFIED_CLOSED",
      "public",
      trackedToken.complainantName,
      "complainant",
      {
        rating,
        ratingComment: feedbackComment
      }
    );

    if (res.success) {
      triggerConfetti();
      setShowFeedbackModal(false);
      refreshTrackedToken(trackedToken.trackingId);
      // Reset comments
      setFeedbackComment("");
    }
  };

  const handleDispute = () => {
    if (!trackedToken || !disputeReason.trim()) return;
    const res = updateTokenStatus(
      trackedToken.id,
      "ASSIGNED",
      "public",
      trackedToken.complainantName,
      "complainant",
      {
        disputeReason: disputeReason.trim(),
      }
    );

    if (res.success) {
      setShowDisputeModal(false);
      refreshTrackedToken(trackedToken.trackingId);
      setDisputeReason("");
    }
  };

  // Helper for priority color tag
  const getPriorityTagClass = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "NEW":
        return "text-slate-400 border-slate-400/20 bg-slate-500/10";
      case "ASSIGNED":
        return "text-blue-500 border-blue-500/20 bg-blue-500/10";
      case "IN_PROGRESS":
        return "text-purple-500 border-purple-500/20 bg-purple-500/10";
      case "ON_HOLD":
        return "text-amber-500 border-amber-500/20 bg-amber-500/10";
      case "RESOLVED":
        return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
      case "VERIFIED_CLOSED":
        return "text-slate-500 border-slate-700 bg-slate-800/10";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Complainant Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            AAI IT Helpdesk · Terminal Incident Center
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab("submit");
              setSubmitSuccess(null);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "submit"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            File Complaint
          </button>
          <button
            onClick={() => {
              setActiveTab("track");
              setSubmitSuccess(null);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "track"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Track Status
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "submit" ? (
          <motion.div
            key="submit"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {submitSuccess ? (
              <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 text-center shadow-lg">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full w-fit mx-auto mb-6">
                  <CheckCircle size={36} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Complaint Submitted Successfully</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mt-2 font-medium">
                  Your incident has been cataloged in the system. The auto-assignment engine is routing it to the next available technician.
                </p>

                <div className="my-8 py-4 px-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl max-w-sm mx-auto">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Your Tracking ID
                  </span>
                  <span className="text-3xl font-extrabold tracking-wider text-blue-500">
                    {submitSuccess.trackingId}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                    Copy this ID to monitor assignment status.
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      const tid = submitSuccess.trackingId;
                      setSearchTrackingId(tid);
                      setActiveTab("track");
                      // Directly refresh with the known tracking ID instead of relying on stale state
                      setTimeout(() => refreshTrackedToken(tid), 50);
                    }}
                    className="btn-primary text-xs"
                  >
                    Track Incident Now
                  </button>
                  <button
                    onClick={() => setSubmitSuccess(null)}
                    className="py-2.5 px-5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
                  >
                    File Another Issue
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-lg flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" /> New Complaint Ticket
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Please provide accurate terminal location details.</p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-500/20">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Complainant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Captain Arpit"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Contact Email / Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. arpit.air@indigo.in"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Description & Terminal Location</label>
                  <textarea
                    rows={4}
                    placeholder="Provide specific details. (e.g. Terminal 3 Counter 4 DCS printer not printing boarding passes. Status light red.)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Incident Photo Attachment</label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-airport-card/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    {mockPhoto ? (
                      <div className="relative rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-800 w-full max-w-[200px] aspect-video">
                        <img src={mockPhoto} className="w-full h-full object-cover" alt="attachment" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMockPhoto(null);
                          }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col items-center gap-2">
                        <ImageIcon className="text-slate-400" size={32} />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          Drag & drop incident photo here, or <span className="text-blue-500 hover:underline">browse</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Supports JPEG, PNG up to 2MB</span>
                        
                        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setMockPhoto("https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&q=80")
                            }
                            className="text-[9px] bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-1 px-2.5 rounded font-extrabold"
                          >
                            Preset: Screen Fault
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMockPhoto("https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80")
                            }
                            className="text-[9px] bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-1 px-2.5 rounded font-extrabold"
                          >
                            Preset: Server Cable
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Send size={16} /> Submit Incident Ticket
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="track"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Search Input */}
            <form onSubmit={handleTrack} className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-md flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter Ticket Tracking ID (e.g. TKN-4180)"
                  value={searchTrackingId}
                  onChange={(e) => setSearchTrackingId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm w-full text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-semibold uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow shadow-blue-500/10"
              >
                Track
              </button>
            </form>

            {trackError && (
              <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-500/20">
                <AlertTriangle size={16} /> {trackError}
              </div>
            )}

            {trackedToken && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side info */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">
                      Incident ID
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                      {trackedToken.trackingId}
                      <button
                        onClick={() => refreshTrackedToken(trackedToken.trackingId)}
                        title="Refresh"
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded text-slate-400 hover:text-slate-100"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColorClass(trackedToken.status)}`}>
                        {trackedToken.status.replace("_", " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityTagClass(trackedToken.priority)}`}>
                        {trackedToken.priority}
                      </span>
                    </div>

                    <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-4 flex flex-col gap-3.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Category</span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">{trackedToken.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Department</span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">{trackedToken.department}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Filed At</span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                          {new Date(trackedToken.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">SLA Window</span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1">
                          <Clock size={12} className="text-blue-500" />
                          {new Date(trackedToken.slaDueAt) > new Date() ? (
                            `Expires: ${new Date(trackedToken.slaDueAt).toLocaleTimeString()}`
                          ) : (
                            <span className="text-rose-500 font-bold">SLA Breached</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {trackedToken.photoUrl && (
                    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-md">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-2">Complaint Photo</span>
                      <img src={trackedToken.photoUrl} alt="fault" className="rounded-lg w-full h-auto object-cover max-h-[180px] border border-slate-200 dark:border-slate-800" />
                    </div>
                  )}
                </div>

                {/* Right side timeline & verification controls */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Actions for resolved ticket */}
                  {trackedToken.status === "RESOLVED" && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl shadow-lg flex flex-col gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle size={16} /> Resolution Verification Required
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          The assigned technician has resolved the issue. Please verify if the issue is solved to close this ticket, or reopen it.
                        </p>
                      </div>

                      {trackedToken.resolutionNote && (
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Technician Resolution Note:</span>
                          <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{trackedToken.resolutionNote}"</p>
                          {trackedToken.resolutionPhoto && (
                            <img src={trackedToken.resolutionPhoto} alt="resolution proof" className="mt-2.5 rounded max-h-[120px] object-cover" />
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowFeedbackModal(true)}
                          className="flex-grow py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow shadow-emerald-600/10"
                        >
                          <Check size={14} /> Verify & Close Ticket
                        </button>
                        <button
                          onClick={() => setShowDisputeModal(true)}
                          className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-500 border border-slate-200 dark:border-slate-800 font-bold text-xs rounded-lg transition-colors"
                        >
                          Dispute Resolution
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {trackedToken.status === "VERIFIED_CLOSED" && trackedToken.rating && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                          <Star size={16} className="fill-blue-500" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Ticket Closed & Rated</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Complainant Feedback recorded</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= (trackedToken.rating || 0) ? "text-amber-500 fill-amber-500" : "text-slate-600"} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incident Description */}
                  <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest mb-1.5">
                      Issue Description
                    </span>
                    <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-medium">
                      {trackedToken.description}
                    </p>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest mb-6">
                      Token Audit Log Timeline
                    </span>

                    <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6 ml-2 flex flex-col gap-6">
                      {tokenHistory.map((h, i) => (
                        <div key={h.id} className="relative">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[31px] top-1 p-1 rounded-full border ${
                            i === tokenHistory.length - 1
                              ? "bg-blue-500 border-blue-400 shadow-md ring-4 ring-blue-500/20"
                              : h.toStatus === "RESOLVED"
                              ? "bg-emerald-500 border-emerald-400"
                              : h.toStatus === "ON_HOLD"
                              ? "bg-amber-500 border-amber-400"
                              : "bg-slate-700 border-slate-800"
                          }`}>
                            <div className="h-1.5 w-1.5 rounded-full" />
                          </div>

                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                                Status: {h.toStatus.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold flex items-center gap-1">
                                <User size={10} /> {h.actorName} ({h.actorRole})
                              </span>
                              {h.note && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/80 font-medium italic">
                                  {h.note}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-bold">
                              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verify / Feedback Modal */}
      {showFeedbackModal && trackedToken && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFeedbackModal(false); }} role="dialog" aria-modal="true" aria-label="Verify and close ticket">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Verify & Close Ticket</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please rate the helpdesk service experience.</p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Satisfaction Score</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={28}
                      className={s <= rating ? "text-amber-500 fill-amber-500" : "text-slate-400 dark:text-slate-700"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Review Comments (Optional)</label>
              <textarea
                rows={3}
                placeholder="Share any feedback about the resolution time or repair quality..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyClose}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                Submit & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && trackedToken && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDisputeModal(false); }} role="dialog" aria-modal="true" aria-label="Dispute resolution">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Dispute & Reopen Ticket</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please state the reasons why the resolution is incomplete.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Reason for Dispute</label>
              <textarea
                rows={4}
                required
                placeholder="Clearly describe what was not fixed or is still failing..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason.trim()}
                className="py-2 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-rose-600/10"
              >
                Reopen Incident
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
