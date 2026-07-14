// Mock localStorage and window for Node environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => {
    storage[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key in storage) {
      delete storage[key];
    }
  },
  length: 0,
  key: () => null
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(global, "window", {
  value: {
    location: {
      reload: () => {}
    }
  },
  writable: true
});

import { db, autoAssignToken, manualAssignToken, updateTokenStatus, createComplaint, toggleTechnicianLeave } from "./db/mockDb";
import { Token } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("=== RUNNING TOKEN AUTO-ASSIGNMENT ALGORITHM TEST SUITE ===");

// 1. Initial State Setup
// Reset mock DB storage
localStorage.clear();

const users = db.getUsers();
const techStatuses = db.getTechStatuses();

// Verify initial technicians setup
const itTechs = users.filter((u) => u.role === "technician" && u.department === "IT Helpdesk");
assert(itTechs.length === 5, `Expected 5 IT technicians, found ${itTechs.length}`);

// Set all IT technicians to "available"
techStatuses.forEach((s) => {
  if (s.department === "IT Helpdesk") {
    s.currentStatus = "available";
  }
});
db.saveTechStatuses(techStatuses);

// Clear existing tokens to run deterministic tests
db.saveTokens([]);
db.savePointers({});
db.saveHistory([]);

// 2. Test Round Robin Rotation
console.log("\n--- Testing Round Robin Rotation ---");

// Helper to get fresh token from DB
const getDbToken = (id: string) => db.getTokens().find((t) => t.id === id)!;

// Create Ticket 1
const t1 = createComplaint("Complainant A", "a@test.com", "Network & WiFi Access", "WiFi issue").token;
const ticket1 = getDbToken(t1.id);
assert(ticket1.status === "ASSIGNED", "Ticket 1 should be auto-assigned");
const tech1 = db.getUsers().find((u) => u.id === ticket1.assignedTo);
assert(tech1?.name === "Aman Sharma", `Ticket 1 should assign to Aman Sharma, assigned to: ${tech1?.name}`);

const pointers1 = db.getPointers();
assert(pointers1["IT Helpdesk"] === 1, `Pointer for IT should be 1, found ${pointers1["IT Helpdesk"]}`);

// Create Ticket 2
const t2 = createComplaint("Complainant B", "b@test.com", "Network & WiFi Access", "WiFi issue").token;
const ticket2 = getDbToken(t2.id);
assert(ticket2.status === "ASSIGNED", "Ticket 2 should be auto-assigned");
const tech2 = db.getUsers().find((u) => u.id === ticket2.assignedTo);
assert(tech2?.name === "Neha Gupta", `Ticket 2 should assign to Neha Gupta, assigned to: ${tech2?.name}`);

const pointers2 = db.getPointers();
assert(pointers2["IT Helpdesk"] === 2, `Pointer for IT should be 2, found ${pointers2["IT Helpdesk"]}`);

// Create Ticket 3
const t3 = createComplaint("Complainant C", "c@test.com", "Network & WiFi Access", "WiFi issue").token;
const ticket3 = getDbToken(t3.id);
assert(ticket3.status === "ASSIGNED", "Ticket 3 should be auto-assigned");
const tech3 = db.getUsers().find((u) => u.id === ticket3.assignedTo);
assert(tech3?.name === "Rohan Das", `Ticket 3 should assign to Rohan Das, assigned to: ${tech3?.name}`);

const pointers3 = db.getPointers();
assert(pointers3["IT Helpdesk"] === 3, `Pointer for IT should be 3, found ${pointers3["IT Helpdesk"]}`);


// 3. Test skipping busy or on-leave technicians
console.log("\n--- Testing Busy / On Leave Skipping ---");

const statuses = db.getTechStatuses();
const vikramStatus = statuses.find((s) => s.userId === "tech-4");
assert(!!vikramStatus, "Vikram status record should exist");
vikramStatus!.currentStatus = "on_leave";
db.saveTechStatuses(statuses);

// Submit Ticket 4. Rotation should start from index after lastAssignedPointer (3) -> starts looking at position 4 (Vikram).
// Vikram is on_leave -> skip.
// Priya (pos 5) is available -> assign to Priya! Pointer becomes 5.
const t4 = createComplaint("Complainant D", "d@test.com", "Network & WiFi Access", "WiFi issue").token;
const ticket4 = getDbToken(t4.id);
assert(ticket4.status === "ASSIGNED", "Ticket 4 should be auto-assigned");
const tech4 = db.getUsers().find((u) => u.id === ticket4.assignedTo);
assert(tech4?.name === "Priya Patel", `Ticket 4 should assign to Priya Patel, assigned to: ${tech4?.name}`);

const pointers4 = db.getPointers();
assert(pointers4["IT Helpdesk"] === 5, `Pointer for IT should be 5, found ${pointers4["IT Helpdesk"]}`);


// 4. Test Wrap-around and No Available Technicians
console.log("\n--- Testing Wrap-around and No Technicians Available ---");

// Currently, all technicians are occupied (busy or on_leave).
// Submit Ticket 5. Start index after 5 wraps around to 1.
// 1 (Aman - busy), 2 (Neha - busy), 3 (Rohan - busy), 4 (Vikram - on_leave), 5 (Priya - busy).
// Ticket should NOT be assigned, and status should stay "NEW".
const t5 = createComplaint("Complainant E", "e@test.com", "Network & WiFi Access", "WiFi issue").token;
const ticket5 = getDbToken(t5.id);
assert(ticket5.status === "NEW", `Ticket 5 status should be NEW, found: ${ticket5.status}`);


// 5. Test Manual Override
console.log("\n--- Testing Manual Override (Pointer Preservation) ---");

// Admin manually assigns Ticket 5 to Neha Gupta (who is busy)
const overrideResult = manualAssignToken(ticket5.id, "tech-2", "admin-1", "Vikas Mehra", "admin");
assert(overrideResult.success, "Manual assignment should succeed");

const t5AfterOverride = db.getTokens().find((t) => t.id === ticket5.id);
assert(t5AfterOverride!.status === "ASSIGNED" && t5AfterOverride!.assignedTo === "tech-2", "Ticket 5 should be assigned to Neha");

// Ensure the pointer did not budge from 5
const pointersAfterOverride = db.getPointers();
assert(pointersAfterOverride["IT Helpdesk"] === 5, `Pointer for IT should remain 5, found ${pointersAfterOverride["IT Helpdesk"]}`);


// 6. Test Technician Resolution and Auto-queue processing
console.log("\n--- Testing Technician Resolution and Auto-Queue Trigger ---");

// Reset Ticket 5 back to NEW status and unassigned to simulate a queued ticket
const tokensReset = db.getTokens();
const t5Token = tokensReset.find((t) => t.id === ticket5.id)!;
t5Token.status = "NEW";
t5Token.assignedTo = undefined;
db.saveTokens(tokensReset);

// Mark Ticket 1 (assigned to Aman Sharma) as RESOLVED by Aman
const resolveResult = updateTokenStatus(ticket1.id, "RESOLVED", "tech-1", "Aman Sharma", "technician", {
  resolutionNote: "Re-patched networking line"
});
assert(resolveResult.success, "Resolution should succeed");

// Aman Sharma should have automatically been assigned the oldest unassigned ticket (Ticket 5)
// Check Ticket 5 status
const t5Final = db.getTokens().find((t) => t.id === ticket5.id);
assert(t5Final!.status === "ASSIGNED", `Ticket 5 status should have automatically updated to ASSIGNED, found: ${t5Final!.status}`);
assert(t5Final!.assignedTo === "tech-1", `Ticket 5 should have been auto-assigned to Aman Sharma, found: ${t5Final!.assignedTo}`);

// Check that the pointer updated to Aman's position (1)
const finalPointers = db.getPointers();
assert(finalPointers["IT Helpdesk"] === 1, `Pointer for IT should have updated to 1, found ${finalPointers["IT Helpdesk"]}`);

// 7. Test Technician Leave and Auto-ticket Re-routing
console.log("\n--- Testing Technician Leave Auto Re-routing ---");

// Ticket 5 is currently assigned to Aman Sharma (tech-1)
// Let's toggle Aman Sharma to "on_leave"
const leaveResult = toggleTechnicianLeave("tech-1", "available");
assert(leaveResult.success, "Aman should successfully be marked on leave");

// Verify that Ticket 5 has been returned to the queue (status NEW, assignedTo undefined)
const t5AfterLeave = db.getTokens().find((t) => t.id === ticket5.id)!;
assert(t5AfterLeave.status === "NEW", `Ticket 5 status should have been set to NEW, found: ${t5AfterLeave.status}`);
assert(t5AfterLeave.assignedTo === undefined, "Ticket 5 assignedTo should be undefined");

// Let's set Aman back to available
const backResult = toggleTechnicianLeave("tech-1", "on_leave");
assert(backResult.success, "Aman should successfully resume duty");

// Since Aman became available, the unassigned queue processor should have immediately assigned Ticket 5 to Aman again!
const t5AfterResume = db.getTokens().find((t) => t.id === ticket5.id)!;
assert(t5AfterResume.status === "ASSIGNED", `Ticket 5 status should have automatically updated to ASSIGNED on roster return, found: ${t5AfterResume.status}`);
assert(t5AfterResume.assignedTo === "tech-1", `Ticket 5 should be assigned to Aman (tech-1), found: ${t5AfterResume.assignedTo}`);

console.log("✅ PASS: Technician leave triggers active ticket re-routing and return triggers assignment.");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Round-Robin assignment engine is fully compliant.");
