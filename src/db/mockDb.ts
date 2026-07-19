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
import { supabase } from "../lib/supabaseClient";

// Seed Data
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

const SEED_USERS: User[] = [
  { id: "admin-1", name: "Vikas Mehra", email: "vikas.mehra@aai.aero", role: "admin", phone: "+919876543210", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "disp-1", name: "Manager", email: "manager@aai.aero", role: "dispatcher", phone: "+919876543211", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },

  // IT Helpdesk Technicians
  { id: "tech-1", name: "Aman Sharma", email: "aman.s@aai.aero", role: "technician", phone: "+919911001101", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-2", name: "Neha Gupta", email: "neha.g@aai.aero", role: "technician", phone: "+919911001102", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-3", name: "Rohan Das", email: "rohan.d@aai.aero", role: "technician", phone: "+919911001103", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-4", name: "Vikram Malhotra", email: "vikram.m@aai.aero", role: "technician", phone: "+919911001104", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-5", name: "Priya Patel", email: "priya.p@aai.aero", role: "technician", phone: "+919911001105", status: "active", department: "IT Helpdesk", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },

  // Other Dept Technicians
  { id: "tech-6", name: "Suresh Kumar", email: "suresh.k@aai.aero", role: "technician", phone: "+919911001106", status: "active", department: "Electrical", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-7", name: "Rajesh Yadav", email: "rajesh.y@aai.aero", role: "technician", phone: "+919911001107", status: "active", department: "Plumbing", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  { id: "tech-8", name: "Sunita Rao", email: "sunita.r@aai.aero", role: "technician", phone: "+919911001108", status: "active", department: "HVAC", createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
];

const SEED_TECH_STATUSES: TechnicianStatus[] = [
  { userId: "tech-1", currentStatus: "available", department: "IT Helpdesk", rotationPosition: 1 },
  { userId: "tech-2", currentStatus: "available", department: "IT Helpdesk", rotationPosition: 2 },
  { userId: "tech-3", currentStatus: "available", department: "IT Helpdesk", rotationPosition: 3 },
  { userId: "tech-4", currentStatus: "available", department: "IT Helpdesk", rotationPosition: 4 },
  { userId: "tech-5", currentStatus: "available", department: "IT Helpdesk", rotationPosition: 5 },
  { userId: "tech-6", currentStatus: "available", department: "Electrical", rotationPosition: 1 },
  { userId: "tech-7", currentStatus: "available", department: "Plumbing", rotationPosition: 1 },
  { userId: "tech-8", currentStatus: "available", department: "HVAC", rotationPosition: 1 }
];

function broadcastSync() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("cts_db_updated"));
  }
}

// Database state accessor functions
export const db = {
  getDepartments: (): Department[] => SEED_DEPARTMENTS,
  getCategories: (): Category[] => SEED_CATEGORIES,

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from("users").select("*");
    if (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
    return data || [];
  },
  saveUsers: async (users: User[]) => {
    const { error } = await supabase.from("users").upsert(users);
    if (error) {
      console.error("Error saving users:", error);
      throw error;
    }
    broadcastSync();
  },

  getTokens: async (): Promise<Token[]> => {
    const { data, error } = await supabase.from("tokens").select("*");
    if (error) {
      console.error("Error fetching tokens:", error);
      throw error;
    }
    return data || [];
  },
  saveTokens: async (tokens: Token[]) => {
    const { error } = await supabase.from("tokens").upsert(tokens);
    if (error) {
      console.error("Error saving tokens:", error);
      throw error;
    }
    broadcastSync();
  },

  getTechStatuses: async (): Promise<TechnicianStatus[]> => {
    const { data, error } = await supabase.from("tech_statuses").select("*");
    if (error) {
      console.error("Error fetching tech statuses:", error);
      throw error;
    }
    return data || [];
  },
  saveTechStatuses: async (statuses: TechnicianStatus[]) => {
    const { error } = await supabase.from("tech_statuses").upsert(statuses);
    if (error) {
      console.error("Error saving tech statuses:", error);
      throw error;
    }
    broadcastSync();
  },

  getHistory: async (): Promise<TokenHistory[]> => {
    const { data, error } = await supabase.from("token_history").select("*");
    if (error) {
      console.error("Error fetching history:", error);
      throw error;
    }
    return data || [];
  },
  saveHistory: async (history: TokenHistory[]) => {
    const { error } = await supabase.from("token_history").upsert(history);
    if (error) {
      console.error("Error saving history:", error);
      throw error;
    }
    broadcastSync();
  },

  getAssignmentLogs: async (): Promise<AssignmentLog[]> => {
    const { data, error } = await supabase.from("assignment_logs").select("*");
    if (error) {
      console.error("Error fetching assignment logs:", error);
      throw error;
    }
    return data || [];
  },
  saveAssignmentLogs: async (logs: AssignmentLog[]) => {
    const { error } = await supabase.from("assignment_logs").upsert(logs);
    if (error) {
      console.error("Error saving assignment logs:", error);
      throw error;
    }
    broadcastSync();
  },

  getNotifications: async (): Promise<NotificationLog[]> => {
    const { data, error } = await supabase.from("notifications").select("*");
    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
    return data || [];
  },
  saveNotifications: async (logs: NotificationLog[]) => {
    const { error } = await supabase.from("notifications").upsert(logs);
    if (error) {
      console.error("Error saving notifications:", error);
      throw error;
    }
    broadcastSync();
  },

  getPointers: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from("pointers").select("*");
    if (error) {
      console.error("Error fetching pointers:", error);
      throw error;
    }
    const record: Record<string, number> = {};
    data?.forEach((row: any) => {
      record[row.department] = row.position;
    });
    return record;
  },
  savePointers: async (pointers: Record<string, number>) => {
    const rows = Object.entries(pointers).map(([dept, pos]) => ({
      department: dept,
      position: pos
    }));
    const { error } = await supabase.from("pointers").upsert(rows);
    if (error) {
      console.error("Error saving pointers:", error);
      throw error;
    }
    broadcastSync();
  },

  resetDatabase: async () => {
    await supabase.from("tokens").delete().neq("id", "");
    await supabase.from("token_history").delete().neq("id", "");
    await supabase.from("assignment_logs").delete().neq("id", "");
    await supabase.from("notifications").delete().neq("id", "");
    await supabase.from("pointers").delete().neq("department", "");
    await supabase.from("users").delete().neq("id", "");
    await supabase.from("tech_statuses").delete().neq("userId", "");
    await supabase.from("users").insert(SEED_USERS);
    await supabase.from("tech_statuses").insert(SEED_TECH_STATUSES);
    broadcastSync();
    window.location.reload();
  },

  createUser: async (user: User): Promise<void> => {
    const { error } = await supabase.from("users").insert(user);
    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }
    broadcastSync();
  },

  updateUser: async (user: User): Promise<void> => {
    const { error } = await supabase.from("users").update(user).eq("id", user.id);
    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }
    broadcastSync();
  },

  deleteUser: async (userId: string): Promise<void> => {
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
    broadcastSync();
  },

  deleteTechnician: async (techId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Fetch and re-route open tickets assigned to this technician
      const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
      if (!tErr && tokens) {
        const assignedTokens = tokens.filter(
          (t) => t.assignedTo === techId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
        );

        if (assignedTokens.length > 0) {
          for (const token of assignedTokens) {
            const oldStatus = token.status;
            await supabase.from("tokens").update({
              status: "NEW",
              assignedTo: null,
              updatedAt: new Date().toISOString()
            }).eq("id", token.id);

            await logHistory(
              token.id,
              oldStatus,
              "NEW",
              "system",
              "Auto Re-routing Engine",
              "system",
              "Assigned technician was deleted from roster. Token returned to queue."
            );
          }
        }
      }

      // 2. Delete tech status from tech_statuses table
      const { error: sErr } = await supabase.from("tech_statuses").delete().eq("userId", techId);
      if (sErr) console.error("Error deleting tech status:", sErr);

      // 3. Delete user record from users table
      const { error: uErr } = await supabase.from("users").delete().eq("id", techId);
      if (uErr) {
        console.error("Error deleting user record:", uErr);
        return { success: false, message: "Error deleting user: " + uErr.message };
      }

      broadcastSync();
      return { success: true, message: "Technician deleted successfully" };
    } catch (err: any) {
      return { success: false, message: err.message || "An error occurred during deletion" };
    }
  },

  deleteAdmin: async (adminId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", adminId);
      if (error) {
        console.error("Error deleting admin:", error);
        return { success: false, message: "Error deleting admin: " + error.message };
      }
      broadcastSync();
      return { success: true, message: "Admin removed successfully" };
    } catch (err: any) {
      return { success: false, message: err.message || "An error occurred" };
    }
  },

  deleteToken: async (tokenId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Delete associated secondary data
      await supabase.from("token_history").delete().eq("tokenId", tokenId);
      await supabase.from("assignment_logs").delete().eq("tokenId", tokenId);
      await supabase.from("notifications").delete().eq("tokenId", tokenId);

      // 2. Delete the token itself
      const { error } = await supabase.from("tokens").delete().eq("id", tokenId);
      if (error) {
        console.error("Error deleting token:", error);
        return { success: false, message: "Error deleting token: " + error.message };
      }

      broadcastSync();
      return { success: true, message: "Complaint deleted successfully" };
    } catch (err: any) {
      return { success: false, message: err.message || "An error occurred" };
    }
  }
};

// Helper: Log notification
async function logNotification(tokenId: string, channel: "email" | "sms" | "push", recipient: string, message: string) {
  const newNotif: NotificationLog = {
    id: generateId("notif"),
    tokenId,
    channel,
    recipient,
    sentAt: new Date().toISOString(),
    status: "success",
    message,
  };
  const { error } = await supabase.from("notifications").insert(newNotif);
  if (error) {
    console.error("Error saving notification:", error);
  }
  broadcastSync();
}

// Helper: Add History Entry
async function logHistory(
  tokenId: string,
  from: TokenStatus | "NONE",
  to: TokenStatus,
  actorId: string,
  actorName: string,
  actorRole: UserRole | "system" | "public",
  note?: string
) {
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
  const { error } = await supabase.from("token_history").insert(entry);
  if (error) {
    console.error("Error saving history:", error);
  }
  broadcastSync();
}

// Validate state transition
function isValidTransition(from: TokenStatus, to: TokenStatus, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Central autoAssign function (Round Robin Engine)
export async function autoAssignToken(tokenId: string): Promise<{ assigned: boolean; message: string; techName?: string }> {
  const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
  if (tErr || !tokens) return { assigned: false, message: "Error fetching tokens" };

  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { assigned: false, message: "Token not found" };
  }

  const token = tokens[tokenIndex];
  const department = token.department;

  // 1. Get technicians in the token's department (excluding resigned)
  const { data: users, error: uErr } = await supabase.from("users").select("*");
  const { data: statuses, error: sErr } = await supabase.from("tech_statuses").select("*");
  if (uErr || sErr || !users || !statuses) return { assigned: false, message: "Error fetching user roster" };

  const deptTechs = statuses.filter(
    (s) => s.department === department && s.currentStatus !== "resigned"
  );

  if (deptTechs.length === 0) {
    await supabase.from("tokens").update({ status: "NEW", updatedAt: new Date().toISOString() }).eq("id", tokenId);
    await logHistory(tokenId, "SUBMITTED", "NEW", "system", "Auto Assignment", "system", "No technicians configured in this department.");
    return { assigned: false, message: "No active technicians configured in this department." };
  }

  // Sort by rotationPosition for deterministic sequence
  const orderedTechs = [...deptTechs].sort((a, b) => a.rotationPosition - b.rotationPosition);

  // 2. Fetch last assigned pointer for this department
  const pointers = await db.getPointers();
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
    const nowStr = new Date().toISOString();

    await supabase.from("tokens").update({
      status: "ASSIGNED",
      assignedTo: techUser.id,
      assignedAt: nowStr,
      updatedAt: nowStr
    }).eq("id", tokenId);

    await supabase.from("tech_statuses").update({
      currentStatus: "busy",
      lastAssignedAt: nowStr
    }).eq("userId", chosenTechStatus.userId);

    pointers[department] = chosenTechStatus.rotationPosition;
    await db.savePointers(pointers);

    const newLog: AssignmentLog = {
      id: generateId("assign"),
      tokenId,
      technicianId: techUser.id,
      method: "auto",
      actorId: "system",
      actorName: "Auto Assignment Engine",
      timestamp: nowStr,
    };
    await supabase.from("assignment_logs").insert(newLog);

    await logHistory(
      tokenId,
      oldStatus,
      "ASSIGNED",
      "system",
      "Auto Assignment Engine",
      "system",
      `Assigned to ${techUser.name} (Roster Position ${chosenTechStatus.rotationPosition})`
    );

    await logNotification(tokenId, "email", token.complainantContact, `Your ticket ${token.trackingId} has been assigned to technician ${techUser.name}.`);
    await logNotification(tokenId, "push", techUser.email, `New Ticket Assigned: ${token.trackingId} - ${token.category}`);

    return {
      assigned: true,
      message: `Auto-assigned to ${techUser.name}`,
      techName: techUser.name,
    };
  }

  // 6. No technicians available
  const oldStatus = token.status;
  await supabase.from("tokens").update({
    status: "NEW",
    updatedAt: new Date().toISOString()
  }).eq("id", tokenId);

  await logHistory(
    tokenId,
    oldStatus,
    "NEW",
    "system",
    "Auto Assignment Engine",
    "system",
    "All technicians are currently Busy or On Leave. Queued for Dispatcher."
  );

  const adminUsers = users.filter((u) => u.role === "admin" || u.role === "dispatcher");
  for (const admin of adminUsers) {
    await logNotification(
      tokenId,
      "push",
      admin.email,
      `Unassigned Ticket Alert: All technicians in ${department} are occupied. ${token.trackingId} is in queue.`
    );
  }

  return {
    assigned: false,
    message: "No technicians available (all occupied or on leave)",
  };
}

// Manual Override Assignment
export async function manualAssignToken(
  tokenId: string,
  techId: string,
  actorId: string,
  actorName: string,
  actorRole: UserRole
): Promise<{ success: boolean; message: string }> {
  const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
  if (tErr || !tokens) return { success: false, message: "Error fetching tokens" };

  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { success: false, message: "Token not found" };
  }

  const { data: users, error: uErr } = await supabase.from("users").select("*");
  if (uErr || !users) return { success: false, message: "Error fetching user roster" };
  const techUser = users.find((u) => u.id === techId);
  if (!techUser || techUser.role !== "technician") {
    return { success: false, message: "Technician not found" };
  }

  const { data: statuses, error: sErr } = await supabase.from("tech_statuses").select("*");
  if (sErr || !statuses) return { success: false, message: "Error fetching technician statuses" };
  const techStatus = statuses.find((s) => s.userId === techId);
  if (!techStatus || techStatus.currentStatus === "resigned") {
    return { success: false, message: "Technician is resigned and unavailable" };
  }

  const token = tokens[tokenIndex];
  const oldStatus = token.status;
  const nowStr = new Date().toISOString();

  // Re-enable previous tech if they were working on this token
  if (token.assignedTo && token.assignedTo !== techId) {
    const prevTechStatus = statuses?.find((s) => s.userId === token.assignedTo);
    if (prevTechStatus && prevTechStatus.currentStatus === "busy") {
      const openTokensForPrevTech = tokens.filter(
        (t) => t.assignedTo === token.assignedTo && t.id !== tokenId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
      );
      if (openTokensForPrevTech.length === 0) {
        await supabase.from("tech_statuses").update({ currentStatus: "available" }).eq("userId", token.assignedTo);
      }
    }
  }

  // Update Token
  await supabase.from("tokens").update({
    status: "ASSIGNED",
    assignedTo: techId,
    assignedAt: nowStr,
    updatedAt: nowStr
  }).eq("id", tokenId);

  // Update new technician status to Busy
  await supabase.from("tech_statuses").update({
    currentStatus: "busy",
    lastAssignedAt: nowStr
  }).eq("userId", techId);

  // Logs
  const newLog: AssignmentLog = {
    id: generateId("assign"),
    tokenId,
    technicianId: techId,
    method: "manual",
    actorId,
    actorName,
    timestamp: nowStr,
  };
  await supabase.from("assignment_logs").insert(newLog);

  await logHistory(
    tokenId,
    oldStatus,
    "ASSIGNED",
    actorId,
    actorName,
    actorRole,
    `Manually assigned to ${techUser.name} by ${actorName}.`
  );

  // Send notifications
  await logNotification(tokenId, "email", token.complainantContact, `Your ticket ${token.trackingId} has been manually assigned to technician ${techUser.name}.`);
  await logNotification(tokenId, "push", techUser.email, `Manual Ticket Assignment: ${token.trackingId} assigned to you.`);

  return { success: true, message: `Manually assigned to ${techUser.name}` };
}

// Check unassigned queue (called when a technician frees up)
export async function checkUnassignedQueue(department: string): Promise<void> {
  const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
  if (tErr || !tokens) return;

  const pendingTokens = tokens
    .filter((t) => t.department === department && (t.status === "NEW" || t.status === "SUBMITTED"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingTokens.length > 0) {
    const nextToken = pendingTokens[0];
    await autoAssignToken(nextToken.id);
  }
}

// Token State Transition function (validation-first, mutation-after)
export async function updateTokenStatus(
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
): Promise<{ success: boolean; message: string }> {
  const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
  if (tErr || !tokens) return { success: false, message: "Error fetching tokens" };

  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) {
    return { success: false, message: "Token not found" };
  }

  const token = tokens[tokenIndex];
  const oldStatus = token.status;

  // === VALIDATION PHASE ===
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

  // === MUTATION PHASE ===
  const nowStr = new Date().toISOString();
  const updateData: Partial<Token> = {
    status: newStatus,
    updatedAt: nowStr
  };

  if (newStatus === "ON_HOLD") {
    updateData.holdReason = details!.holdReason;
  }

  if (newStatus === "RESOLVED") {
    updateData.resolutionNote = details!.resolutionNote;
    updateData.resolvedAt = nowStr;
    if (details!.resolutionPhoto) {
      updateData.resolutionPhoto = details!.resolutionPhoto;
    }
  }

  if (newStatus === "VERIFIED_CLOSED" && details?.rating) {
    updateData.rating = details.rating;
    if (details.ratingComment) {
      updateData.ratingComment = details.ratingComment;
    }
  }

  if (oldStatus === "RESOLVED" && newStatus === "ASSIGNED" && details?.disputeReason) {
    updateData.disputeReason = details.disputeReason;
  }

  await supabase.from("tokens").update(updateData).eq("id", tokenId);

  // Handle Technician availability side effects
  const techId = token.assignedTo;
  if (techId) {
    const { data: statuses } = await supabase.from("tech_statuses").select("*");
    const techStatus = statuses?.find((s) => s.userId === techId);

    if (techStatus) {
      if (["RESOLVED", "VERIFIED_CLOSED"].includes(newStatus)) {
        const { data: freshTokens } = await supabase.from("tokens").select("*");
        const openTokensForTech = (freshTokens || []).filter(
          (t) => t.assignedTo === techId && t.id !== tokenId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
        );
        if (openTokensForTech.length === 0) {
          await supabase.from("tech_statuses").update({ currentStatus: "available" }).eq("userId", techId);
          await checkUnassignedQueue(token.department);
        }
      } else if (["IN_PROGRESS", "ON_HOLD", "ASSIGNED"].includes(newStatus)) {
        await supabase.from("tech_statuses").update({ currentStatus: "busy" }).eq("userId", techId);
      }
    }
  }

  // If token is REOPENED (RESOLVED -> ASSIGNED)
  if (oldStatus === "RESOLVED" && newStatus === "ASSIGNED") {
    if (techId) {
      const { data: statuses } = await supabase.from("tech_statuses").select("*");
      const techStatus = statuses?.find((s) => s.userId === techId);
      if (techStatus && techStatus.currentStatus !== "resigned") {
        await supabase.from("tech_statuses").update({ currentStatus: "busy" }).eq("userId", techId);
        await logNotification(tokenId, "push", techStatus.userId, `Ticket Reopened: Complainant disputed resolution for ${token.trackingId}`);
      }
    }
  }

  // Build audit note
  let noteString = "";
  if (newStatus === "ON_HOLD") noteString = `Hold Reason: ${details?.holdReason}`;
  else if (newStatus === "RESOLVED") noteString = `Resolution: ${details?.resolutionNote}`;
  else if (newStatus === "VERIFIED_CLOSED" && details?.rating) noteString = `Feedback: ${details.rating} Stars. ${details.ratingComment || ""}`;
  else if (details?.disputeReason) noteString = `Dispute: ${details.disputeReason}`;

  await logHistory(tokenId, oldStatus, newStatus, actorId, actorName, actorRole, noteString || undefined);

  // Send notifications
  if (newStatus === "RESOLVED") {
    await logNotification(
      tokenId,
      "email",
      token.complainantContact,
      `Your ticket ${token.trackingId} has been marked as Resolved. Please review and verify to close.`
    );
  } else if (newStatus === "VERIFIED_CLOSED") {
    await logNotification(
      tokenId,
      "email",
      token.complainantContact,
      `Thank you! Your ticket ${token.trackingId} has been verified and closed.`
    );
  }

  return { success: true, message: `Status updated to ${newStatus}` };
}

// Add/Submit new complaint from Complainant
export async function createComplaint(
  name: string,
  contact: string,
  categoryName: string,
  description: string,
  photoUrl?: string
): Promise<{ success: boolean; token: Token }> {
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

  const { error } = await supabase.from("tokens").insert(newToken);
  if (error) {
    console.error("Error creating complaint:", error);
    throw error;
  }

  await logHistory(tokenId, "NONE", "SUBMITTED", "public", name, "complainant", "Complaint submitted via portal");
  await logNotification(tokenId, "email", contact, `Ticket ${trackingId} created. Track it on the IGI Helpdesk portal.`);

  // Auto assign right away
  await autoAssignToken(tokenId);

  // Re-read from storage to get the updated token
  const { data: freshTokens } = await supabase.from("tokens").select("*").eq("id", tokenId);
  const freshToken = freshTokens?.[0];

  return { success: true, token: freshToken || newToken };
}

// Centralized leave manager with auto re-routing of active tickets
export async function toggleTechnicianLeave(techId: string, currentStatus: TechStatus): Promise<{ success: boolean; message: string }> {
  const { data: statuses, error: sErr } = await supabase.from("tech_statuses").select("*");
  if (sErr || !statuses) {
    return { success: false, message: "Technician status record not found." };
  }

  const idx = statuses.findIndex((s) => s.userId === techId);
  if (idx === -1) {
    return { success: false, message: "Technician status record not found." };
  }

  const nextStatus = currentStatus === "on_leave" ? "available" : "on_leave";

  if (nextStatus === "on_leave") {
    // Re-route open tickets
    const { data: tokens, error: tErr } = await supabase.from("tokens").select("*");
    if (!tErr && tokens) {
      const openTokensForTech = tokens.filter(
        (t) => t.assignedTo === techId && ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status)
      );

      if (openTokensForTech.length > 0) {
        for (const token of openTokensForTech) {
          const oldStatus = token.status;
          await supabase.from("tokens").update({
            status: "NEW",
            assignedTo: null,
            updatedAt: new Date().toISOString()
          }).eq("id", token.id);

          await logHistory(
            token.id,
            oldStatus,
            "NEW",
            "system",
            "Auto Re-routing Engine",
            "system",
            "Technician toggled leave. Token auto-returned to queue."
          );
        }
      }
    }
  }

  await supabase.from("tech_statuses").update({ currentStatus: nextStatus }).eq("userId", techId);

  if (nextStatus === "available") {
    // Check queue immediately
    await checkUnassignedQueue(statuses[idx].department);
  }

  return { success: true, message: `Technician status updated to ${nextStatus}` };
}
