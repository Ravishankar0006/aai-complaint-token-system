export type UserRole = "complainant" | "technician" | "manager" | "admin";

export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  status: UserStatus;
  department: string;
  createdAt: string;
}

export type TokenStatus =
  | "SUBMITTED"
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "RESOLVED"
  | "VERIFIED_CLOSED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// Valid state machine transitions
export const VALID_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  SUBMITTED: ["NEW", "ASSIGNED"],
  NEW: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "NEW"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED"],
  ON_HOLD: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["VERIFIED_CLOSED", "ASSIGNED"],
  VERIFIED_CLOSED: [],
};

export interface Token {
  id: string;
  trackingId: string;
  complainantName: string;
  complainantContact: string;
  category: string;
  department: string;
  description: string;
  photoUrl?: string;
  priority: Priority;
  status: TokenStatus;
  assignedTo?: string;
  assignedAt?: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  ratingComment?: string;
  holdReason?: string;
  disputeReason?: string;
  resolutionPhoto?: string;
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface TokenHistory {
  id: string;
  tokenId: string;
  fromStatus: TokenStatus | "NONE";
  toStatus: TokenStatus;
  actorId: string;
  actorName: string;
  actorRole: UserRole | "system" | "public";
  note?: string;
  timestamp: string;
}

export type TechStatus = "available" | "busy" | "on_leave" | "resigned";

export interface TechnicianStatus {
  userId: string;
  currentStatus: TechStatus;
  department: string;
  rotationPosition: number;
  lastAssignedAt?: string;
}

export interface AssignmentLog {
  id: string;
  tokenId: string;
  technicianId: string;
  method: "auto" | "manual";
  actorId: string;
  actorName: string;
  timestamp: string;
}

export interface Category {
  id: string;
  name: string;
  department: string;
  defaultSlaHours: number;
}

export interface Department {
  id: string;
  name: string;
}

export interface NotificationLog {
  id: string;
  tokenId: string;
  channel: "email" | "sms" | "push";
  recipient: string;
  sentAt: string;
  status: "success" | "failed";
  message: string;
}

// Utility: generate unique IDs
let _idCounter = 0;
export function generateId(prefix: string): string {
  _idCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}${random}${_idCounter}`;
}

// Utility: generate tracking IDs with collision avoidance
export function generateTrackingId(todayCount: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const seq = String(todayCount + 1).padStart(4, "0");
  return `TKN-${year}${month}${date}-${seq}`;
}
