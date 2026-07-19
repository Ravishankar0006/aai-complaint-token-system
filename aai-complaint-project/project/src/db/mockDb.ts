import {
  User,
  Token,
  TokenHistory,
  TechnicianStatus,
  AssignmentLog,
  Category,
  Department,
  NotificationLog,
  TokenStatus,
  UserRole,
  TechStatus,
  VALID_TRANSITIONS,
  generateId,
  generateTrackingId,
} from "../types";
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────────────
// Static configuration (not per-user data — no need for this to live in the
// database; every user should see the same fixed list of departments and
// complaint categories).
// ─────────────────────────────────────────────────────────────────────────
const SEED_DEPARTMENTS: Department[] = [
  { id: "dept-it", name: "IT Helpdesk" },
  { id: "dept-elec", name: "Electrical" },
  { id: "dept-plumb", name: "Plumbing" },
  { id: "dept-hvac", name: "HVAC" },
];

const SEED_CATEGORIES: Category[] = [
  { id: "cat-wifi", name: "Network & WiFi Access", department: "IT Helpdesk", defaultSlaHours: 4 },
  { id: "cat-hw", name: "Hardware & Terminal PCs", department: "IT Helpdesk", defaultSlaHours: 8 },
  { id: "cat-sw", name: "Software & System Access", department: "IT Helpdesk", defaultSlaHours: 24 },
  { id: "cat-power", name: "Power Failure & Outage", department: "Electrical", defaultSlaHours: 2 },
  { id: "cat-light", name: "Terminal Light Replacement", department: "Electrical", defaultSlaHours: 12 },
  { id: "cat-leak", name: "Water Leakage & Washroom", department: "Plumbing", defaultSlaHours: 3 },
  { id: "cat-ac", name: "AC Cooling & Ventilation", department: "HVAC", defaultSlaHours: 6 },
];

// ─────────────────────────────────────────────────────────────────────────
// In-memory cache. This is what every page reads synchronously via
// db.getTokens(), db.getUsers(), etc. — exactly like before. The cache is:
//   1) populated once at app startup from Supabase (see initDb()), and
//   2) kept in sync automatically whenever ANY user changes data, via a
//      Supabase Realtime subscription (see subscribeRealtime()).
// This is what makes changes show up live for every logged-in user.
// ─────────────────────────────────────────────────────────────────────────
let _users: User[] = [];
let _tokens: Token[] = [];
let _techStatuses: TechnicianStatus[] = [];
let _history: TokenHistory[] = [];
let _assignmentLogs: AssignmentLog[] = [];
let _notifications: NotificationLog[] = [];
let _pointers: Record<string, number> = {};

let _initPromise: Promise<void> | null = null;

// BroadcastChannel: keeps multiple tabs on the SAME device instantly in sync
// (no network round-trip needed). Realtime (below) handles syncing across
// DIFFERENT users/devices. Keeping both is harmless and gives the snappiest
// experience on the same machine.
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    syncChannel = new BroadcastChannel("cts_db_sync_channel");
    syncChannel.onmessage = (event) => {
      if (event.data === "sync" && typeof window !== "undefined") {
        window.dispatchEvent(new Event("cts_db_updated"));
      }
    };
  }
} catch (e) {
  // Gracefully skip BroadcastChannel in non-browser environments (e.g. tests)
}

function broadcastSync() {
  if (syncChannel) {
    syncChannel.postMessage("sync");
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("cts_db_updated"));
  }
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`Failed to fetch "${table}" from Supabase:`, error.message);
    return [];
  }
  return (data as T[]) ?? [];
}

async function fetchPointers(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("pointers").select("*");
  if (error) {
    console.error("Failed to fetch pointers from Supabase:", error.message);
    return {};
  }
  const result: Record<string, number> = {};
  (data ?? []).forEach((row: { department: string; position: number }) => {
    result[row.department] = row.position;
  });
  return result;
}

// One shared realtime channel that listens for changes on every table and
// refreshes the matching slice of the local cache, then notifies the UI via
// the same "cts_db_updated" event pages already listen for.
function subscribeRealtime() {
  supabase
    .channel("cts-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "tokens" }, async () => {
      _tokens = await fetchTable<Token>("tokens");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, async () => {
      _users = await fetchTable<User>("users");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "tech_statuses" }, async () => {
      _techStatuses = await fetchTable<TechnicianStatus>("tech_statuses");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "token_history" }, async () => {
      _history = await fetchTable<TokenHistory>("token_history");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "assignment_logs" }, async () => {
      _assignmentLogs = await fetchTable<AssignmentLog>("assignment_logs");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
      _notifications = await fetchTable<NotificationLog>("notifications");
      broadcastSync();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "pointers" }, async () => {
      _pointers = await fetchPointers();
      broadcastSync();
    })
    .subscribe();
}

// Call this once, before the app renders (see src/main.tsx). It loads all
// current data from Supabase into the cache and starts the realtime
// subscription. Safe to call more than once — subsequent calls reuse the
// same in-flight/completed promise.
export function initDb(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const [users, tokens, techStatuses, history, assignmentLogs, notifications, pointers] =
      await Promise.all([
        fetchTable<User>("users"),
        fetchTable<Token>("tokens"),
        fetchTable<TechnicianStatus>("tech_statuses"),
        fetchTable<TokenHistory>("token_history"),
        fetchTable<AssignmentLog>("assignment_logs"),
        fetchTable<NotificationLog>("notifications"),
        fetchPointers(),
      ]);

    _users = users;
    _tokens = tokens;
    _techStatuses = techStatuses;
    _history = history;
    _assignmentLogs = assignmentLogs;
    _notifications = notifications;
    _pointers = pointers;

    subscribeRealtime();
  })();

  return _initPromise;
}

// Fire-and-forget upsert to Supabase. The local cache has already been
// updated synchronously above the call site, so the UI never waits on this —
// it just pushes the change to the shared database in the background so
// every other user's realtime subscription picks it up.
function pushUpsert(table: string, rows: unknown[]) {
  if (rows.length === 0) return;
  supabase
    .from(table)
    .upsert(rows)
    .then(({ error }) => {
      if (error) {
        console.error(`Failed to save to "${table}" in Supabase:`, error.message);
      }
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Public db object — SAME SHAPE as the old localStorage version, so nothing
// in App.tsx / AdminDashboard.tsx / TechnicianPanel.tsx / ComplainantPortal.tsx
// / LandingPage.tsx / LoginPortal.tsx needs to change.
// ─────────────────────────────────────────────────────────────────────────
export const db = {
  getDepartments: (): Department[] => SEED_DEPARTMENTS,
  getCategories: (): Category[] => SEED_CATEGORIES,

  getUsers: (): User[] => _users,
  saveUsers: (users: User[]) => {
    _users = users;
    broadcastSync();
    pushUpsert("users", users);
  },

  getTokens: (): Token[] => _tokens,
  saveTokens: (tokens: Token[]) => {
    _tokens = tokens;
    broadcastSync();
    pushUpsert("tokens", tokens);
  },

  getTechStatuses: (): TechnicianStatus[] => _techStatuses,
  saveTechStatuses: (statuses: TechnicianStatus[]) => {
    _techStatuses = statuses;
    broadcastSync();
    pushUpsert("tech_statuses", statuses);
  },

  getHistory: (): TokenHistory[] => _history,
  saveHistory: (history: TokenHistory[]) => {
    _history = history;
    broadcastSync();
    pushUpsert("token_history", history);
  },

  getAssignmentLogs: (): AssignmentLog[] => _assignmentLogs,
  saveAssignmentLogs: (logs: AssignmentLog[]) => {
    _assignmentLogs = logs;
    broadcastSync();
    pushUpsert("assignment_logs", logs);
  },

  getNotifications: (): NotificationLog[] => _notifications,
  saveNotifications: (logs: NotificationLog[]) => {
    _notifications = logs;
    broadcastSync();
    pushUpsert("notifications", logs);
  },

  getPointers: (): Record<string, number> => _pointers,
  savePointers: (pointers: Record<string, number>) => {
    _pointers = pointers;
    broadcastSync();
    const rows = Object.entries(pointers).map(([department, position]) => ({ department, position }));
    pushUpsert("pointers", rows);
  },

  // NOTE: this now wipes the SHARED cloud database for every user, not just
  // your own browser. It isn't wired to any button in the current UI. Only
  // call it deliberately (e.g. from the browser console) when you actually
  // want to clear all live data.
  resetDatabase: async () => {
    const tables = ["tokens", "users", "tech_statuses", "token_history", "assignment_logs", "notifications", "pointers"];
    for (const table of tables) {
      const idColumn = table === "pointers" ? "department" : table === "tech_statuses" ? "userId" : "id";
      await supabase.from(table).delete().neq(idColumn, "___none___");
    }
    window.location.reload();
  },
};

// Helper: Log notification
function logNotification(tokenId: string, channel: "email" | "sms" | "push", recipient: string, message: string) {
  const notifications = db.getNotifications();
  const newNotif: NotificationLog = {
    id: generateId("notif"),
    tokenId,
    channel,
    recipient,
    sentAt: new Date().toISOString(),
    status: "success",
    message,
  };
  db.saveNotifications([newNotif, ...notifications]);
}

// Helper: Add History Entry
function logHistory(
  tokenId: string,
  from: TokenStatus | "NONE",
  to: TokenStatus,
  actorId: string,
  actorName: string,
  actorRole: UserRole | "system" | "public",
  note?: string
) {
  const history = db.getHistory();
  const entry: TokenHistory = {
    id: generateId("hist"),
    tokenId,
    fromStatus: from,
    toStatus: to,
    actorId,
    actorName,
    actorRole,
    note,
    timestamp: new Date().toISOString(),
  };
  db.saveHistory([...history, entry]);
}

// Validate state transition
function isValidTransition(from: TokenStatus, to: TokenStatus, isAdmin: boolean): boolean {
  // Admins can force certain transitions that normal flow cannot
  if (isAdmin) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Central autoAssign function (Round Robin Engine)
export function autoAssignToken(tokenId: string): { assigned: boolean; message: string; techName?: string } {
  const tokens = db.getTokens();
  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { assigned: false, message: "Token not found" };
  }

  const token = tokens[tokenIndex];
  const department = token.department;

  // 1. Get technicians in the token's department (excluding resigned)
  const users = db.getUsers();
  const statuses = db.getTechStatuses();

  const deptTechs = statuses.filter(
    (s) => s.department === department && s.currentStatus !== "resigned"
  );

  if (deptTechs.length === 0) {
    token.status = "NEW";
    token.updatedAt = new Date().toISOString();
    db.saveTokens(tokens);
    logHistory(tokenId, "SUBMITTED", "NEW", "system", "Auto Assignment", "system", "No technicians configured in this department.");
    return { assigned: false, message: "No active technicians configured in this department." };
  }

  // Sort by rotationPosition for deterministic sequence
  const orderedTechs = [...deptTechs].sort((a, b) => a.rotationPosition - b.rotationPosition);

  // 2. Fetch last assigned pointer for this department
  const pointers = db.getPointers();
  const lastPos = pointers[department] !== undefined ? pointers[department] : 0;

  // 3. Find startIndex: first tech whose position > lastPos
  let startIndex = orderedTechs.findIndex((t) => t.rotationPosition > lastPos);
  if (startIndex === -1) {
    startIndex = 0; // Wrap around
  }

  // 4. Loop to find an "available" technician
  const len = orderedTechs.length;
  let chosenTechStatus: TechnicianStatus | null = null;

  for (let i = 0; i < len; i++) {
    const candidate = orderedTechs[(startIndex + i) % len];
    if (candidate.currentStatus === "available") {
      chosenTechStatus = candidate;
      break;
    }
  }

  // 5. If technician found, assign
  if (chosenTechStatus) {
    const techUser = users.find((u) => u.id === chosenTechStatus!.userId);
    if (!techUser) {
      return { assigned: false, message: "Assigned technician user record missing" };
    }

    const oldStatus = token.status;
    token.status = "ASSIGNED";
    token.assignedTo = techUser.id;
    token.assignedAt = new Date().toISOString();
    token.updatedAt = new Date().toISOString();
    db.saveTokens(tokens);

    chosenTechStatus.currentStatus = "busy";
    chosenTechStatus.lastAssignedAt = new Date().toISOString();
    db.saveTechStatuses(statuses);

    pointers[department] = chosenTechStatus.rotationPosition;
    db.savePointers(pointers);

    const logs = db.getAssignmentLogs();
    const newLog: AssignmentLog = {
      id: generateId("assign"),
      tokenId,
      technicianId: techUser.id,
      method: "auto",
      actorId: "system",
      actorName: "Auto Assignment Engine",
      timestamp: new Date().toISOString(),
    };
    db.saveAssignmentLogs([newLog, ...logs]);

    logHistory(
      tokenId,
      oldStatus,
      "ASSIGNED",
      "system",
      "Auto Assignment Engine",
      "system",
      `Assigned to ${techUser.name} (Roster Position ${chosenTechStatus.rotationPosition})`
    );

    logNotification(tokenId, "email", token.complainantContact, `Your ticket ${token.trackingId} has been assigned to technician ${techUser.name}.`);
    logNotification(tokenId, "push", techUser.email, `New Ticket Assigned: ${token.trackingId} - ${token.category}`);

    return {
      assigned: true,
      message: `Auto-assigned to ${techUser.name}`,
      techName: techUser.name,
    };
  }

  // 6. No technicians available
  const oldStatus = token.status;
  token.status = "NEW";
  token.updatedAt = new Date().toISOString();
  db.saveTokens(tokens);

  logHistory(
    tokenId,
    oldStatus,
    "NEW",
    "system",
    "Auto Assignment Engine",
    "system",
    "All technicians are currently Busy or On Leave. Queued for Dispatcher."
  );

  const adminUsers = users.filter((u) => u.role === "admin" || u.role === "dispatcher");
  adminUsers.forEach((admin) => {
    logNotification(
      tokenId,
      "push",
      admin.email,
      `Unassigned Ticket Alert: All technicians in ${department} are occupied. ${token.trackingId} is in queue.`
    );
  });

  return {
    assigned: false,
    message: "No technicians available (all occupied or on leave)",
  };
}

// Manual Override Assignment
export function manualAssignToken(
  tokenId: string,
  techId: string,
  actorId: string,
  actorName: string,
  actorRole: UserRole
): { success: boolean; message: string } {
  const tokens = db.getTokens();
  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { success: false, message: "Token not found" };
  }

  const users = db.getUsers();
  const techUser = users.find((u) => u.id === techId);
  if (!techUser || techUser.role !== "technician") {
    return { success: false, message: "Technician not found" };
  }

  const statuses = db.getTechStatuses();
  const techStatus = statuses.find((s) => s.userId === techId);
  if (!techStatus || techStatus.currentStatus === "resigned") {
    return { success: false, message: "Technician is resigned and unavailable" };
  }

  const token = tokens[tokenIndex];
  const oldStatus = token.status;

  // Re-enable previous tech if they were working on this token
  if (token.assignedTo && token.assignedTo !== techId) {
    const prevTechStatus = statuses.find((s) => s.userId === token.assignedTo);
    if (prevTechStatus && prevTechStatus.currentStatus === "busy") {
      // Check if they have other open tokens before marking available
      const openTokensForPrevTech = tokens.filter(
        (t) => t.assignedTo === token.assignedTo && t.id !== tokenId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
      );
      if (openTokensForPrevTech.length === 0) {
        prevTechStatus.currentStatus = "available";
      }
    }
  }

  // Update Token
  token.status = "ASSIGNED";
  token.assignedTo = techId;
  token.assignedAt = new Date().toISOString();
  token.updatedAt = new Date().toISOString();
  db.saveTokens(tokens);

  // Update new technician status to Busy
  techStatus.currentStatus = "busy";
  techStatus.lastAssignedAt = new Date().toISOString();
  db.saveTechStatuses(statuses);

  // Note: We deliberately DO NOT disturb lastAssignedPointer in department,
  // matching Section 5.4 override rules.

  // Logs
  const logs = db.getAssignmentLogs();
  const newLog: AssignmentLog = {
    id: generateId("assign"),
    tokenId,
    technicianId: techId,
    method: "manual",
    actorId,
    actorName,
    timestamp: new Date().toISOString(),
  };
  db.saveAssignmentLogs([newLog, ...logs]);

  logHistory(
    tokenId,
    oldStatus,
    "ASSIGNED",
    actorId,
    actorName,
    actorRole,
    `Manually assigned to ${techUser.name} by ${actorName}.`
  );

  // Send notifications
  logNotification(tokenId, "email", token.complainantContact, `Your ticket ${token.trackingId} has been manually assigned to technician ${techUser.name}.`);
  logNotification(tokenId, "push", techUser.email, `Manual Ticket Assignment: ${token.trackingId} assigned to you.`);

  return { success: true, message: `Manually assigned to ${techUser.name}` };
}

// Check unassigned queue (called when a technician frees up)
export function checkUnassignedQueue(department: string): void {
  const tokens = db.getTokens();
  // Find oldest NEW or SUBMITTED token in department
  const pendingTokens = tokens
    .filter((t) => t.department === department && (t.status === "NEW" || t.status === "SUBMITTED"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingTokens.length > 0) {
    const nextToken = pendingTokens[0];
    // Trigger autoAssign for it
    autoAssignToken(nextToken.id);
  }
}

// Token State Transition function (validation-first, mutation-after)
export function updateTokenStatus(
  tokenId: string,
  newStatus: TokenStatus,
  actorId: string,
  actorName: string,
  actorRole: UserRole | "system" | "public",
  details?: {
    holdReason?: string;
    resolutionPhoto?: string;
    resolutionNote?: string;
    rating?: number;
    ratingComment?: string;
    disputeReason?: string;
  }
): { success: boolean; message: string } {
  const tokens = db.getTokens();
  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { success: false, message: "Token not found" };
  }

  const token = tokens[tokenIndex];
  const oldStatus = token.status;

  // === VALIDATION PHASE (no mutations) ===
  if (oldStatus === newStatus) {
    return { success: false, message: "State is already identical" };
  }

  const isAdminActor = actorRole === "admin" || actorRole === "dispatcher" || actorRole === "system";
  if (!isValidTransition(oldStatus, newStatus, isAdminActor)) {
    return { success: false, message: `Invalid transition: ${oldStatus} to ${newStatus} is not allowed.` };
  }

  if (newStatus === "ON_HOLD" && !details?.holdReason) {
    return { success: false, message: "Hold reason is mandatory when placing a token on hold" };
  }

  if (newStatus === "RESOLVED" && !details?.resolutionNote) {
    return { success: false, message: "Resolution note is mandatory when resolving a token" };
  }

  // === MUTATION PHASE (all validation passed) ===
  token.status = newStatus;
  token.updatedAt = new Date().toISOString();

  if (newStatus === "ON_HOLD") {
    token.holdReason = details!.holdReason;
  }

  if (newStatus === "RESOLVED") {
    token.resolutionNote = details!.resolutionNote;
    token.resolvedAt = new Date().toISOString();
    if (details!.resolutionPhoto) {
      token.resolutionPhoto = details!.resolutionPhoto;
    }
  }

  if (newStatus === "VERIFIED_CLOSED" && details?.rating) {
    token.rating = details.rating;
    if (details.ratingComment) {
      token.ratingComment = details.ratingComment;
    }
  }

  // Store dispute reason when reopening
  if (oldStatus === "RESOLVED" && newStatus === "ASSIGNED" && details?.disputeReason) {
    token.disputeReason = details.disputeReason;
  }

  db.saveTokens(tokens);

  // Handle Technician availability side effects
  const techId = token.assignedTo;
  if (techId) {
    const statuses = db.getTechStatuses();
    const techStatus = statuses.find((s) => s.userId === techId);

    if (techStatus) {
      if (["RESOLVED", "VERIFIED_CLOSED"].includes(newStatus)) {
        const openTokensForTech = tokens.filter(
          (t) => t.assignedTo === techId && t.id !== tokenId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
        );
        if (openTokensForTech.length === 0) {
          techStatus.currentStatus = "available";
          db.saveTechStatuses(statuses);
          checkUnassignedQueue(token.department);
        }
      } else if (["IN_PROGRESS", "ON_HOLD", "ASSIGNED"].includes(newStatus)) {
        techStatus.currentStatus = "busy";
        db.saveTechStatuses(statuses);
      }
    }
  }

  // If token is REOPENED (RESOLVED -> ASSIGNED)
  if (oldStatus === "RESOLVED" && newStatus === "ASSIGNED") {
    if (techId) {
      const statuses = db.getTechStatuses();
      const techStatus = statuses.find((s) => s.userId === techId);
      if (techStatus && techStatus.currentStatus !== "resigned") {
        techStatus.currentStatus = "busy";
        db.saveTechStatuses(statuses);
        logNotification(tokenId, "push", techStatus.userId, `Ticket Reopened: Complainant disputed resolution for ${token.trackingId}`);
      }
    }
  }

  // Build audit note
  let noteString = "";
  if (newStatus === "ON_HOLD") noteString = `Hold Reason: ${details?.holdReason}`;
  else if (newStatus === "RESOLVED") noteString = `Resolution: ${details?.resolutionNote}`;
  else if (newStatus === "VERIFIED_CLOSED" && details?.rating) noteString = `Feedback: ${details.rating} Stars. ${details.ratingComment || ""}`;
  else if (details?.disputeReason) noteString = `Dispute: ${details.disputeReason}`;

  logHistory(tokenId, oldStatus, newStatus, actorId, actorName, actorRole, noteString || undefined);

  // Send notifications
  if (newStatus === "RESOLVED") {
    logNotification(
      tokenId,
      "email",
      token.complainantContact,
      `Your ticket ${token.trackingId} has been marked as Resolved. Please review and verify to close.`
    );
  } else if (newStatus === "VERIFIED_CLOSED") {
    logNotification(
      tokenId,
      "email",
      token.complainantContact,
      `Thank you! Your ticket ${token.trackingId} has been verified and closed.`
    );
  }

  return { success: true, message: `Status updated to ${newStatus}` };
}

// Add/Submit new complaint from Complainant
export function createComplaint(
  name: string,
  contact: string,
  categoryName: string,
  description: string,
  photoUrl?: string
): { success: boolean; token: Token } {
  const categories = db.getCategories();
  const categoryObj = categories.find((c) => c.name === categoryName);
  const department = categoryObj ? categoryObj.department : "IT Helpdesk";
  const slaHours = categoryObj ? categoryObj.defaultSlaHours : 8;

  const trackingId = generateTrackingId();
  const tokenId = generateId("token");

  const newToken: Token = {
    id: tokenId,
    trackingId,
    complainantName: name,
    complainantContact: contact,
    category: categoryName,
    department,
    description,
    photoUrl,
    priority: slaHours <= 3 ? "CRITICAL" : slaHours <= 6 ? "HIGH" : slaHours <= 12 ? "MEDIUM" : "LOW",
    status: "SUBMITTED",
    slaDueAt: new Date(Date.now() + slaHours * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tokens = db.getTokens();
  db.saveTokens([...tokens, newToken]);

  logHistory(tokenId, "NONE", "SUBMITTED", "public", name, "complainant", "Complaint submitted via portal");
  logNotification(tokenId, "email", contact, `Ticket ${trackingId} created. Track it on the IGI Helpdesk portal.`);

  // Auto assign right away
  autoAssignToken(tokenId);

  // Re-read from the cache to get the updated token (autoAssign may have changed status)
  const freshToken = db.getTokens().find((t) => t.id === tokenId);
  return { success: true, token: freshToken || newToken };
}

// Centralized leave manager with auto re-routing of active tickets
export function toggleTechnicianLeave(techId: string, currentStatus: TechStatus): { success: boolean; message: string } {
  const statuses = db.getTechStatuses();
  const idx = statuses.findIndex((s) => s.userId === techId);
  if (idx === -1) {
    return { success: false, message: "Technician status record not found." };
  }

  const nextStatus = currentStatus === "on_leave" ? "available" : "on_leave";

  if (nextStatus === "on_leave") {
    // Re-route open tickets
    const tokens = db.getTokens();
    const openTokensForTech = tokens.filter(
      (t) => t.assignedTo === techId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
    );

    if (openTokensForTech.length > 0) {
      openTokensForTech.forEach((token) => {
        const oldStatus = token.status;
        token.status = "NEW";
        token.assignedTo = undefined;
        token.updatedAt = new Date().toISOString();

        logHistory(
          token.id,
          oldStatus,
          "NEW",
          "system",
          "Auto Re-routing Engine",
          "system",
          "Technician toggled leave. Token auto-returned to queue."
        );
      });
      db.saveTokens(tokens);
    }
  }

  statuses[idx].currentStatus = nextStatus;
  db.saveTechStatuses(statuses);

  if (nextStatus === "available") {
    // Check queue immediately
    checkUnassignedQueue(statuses[idx].department);
  }

  return { success: true, message: `Technician status updated to ${nextStatus}` };
}
