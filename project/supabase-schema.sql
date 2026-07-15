-- ═══════════════════════════════════════════════════════════════════════
-- Run this ONCE in Supabase: Project -> SQL Editor -> New query -> paste
-- this whole file -> Run.
--
-- Column names intentionally match the TypeScript field names exactly
-- (camelCase, in double quotes) so the app code needs no field-name
-- translation layer.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null,
  role text not null,
  phone text,
  status text not null,
  department text,
  "createdAt" timestamptz not null default now()
);

create table if not exists tokens (
  id text primary key,
  "trackingId" text not null,
  "complainantName" text not null,
  "complainantContact" text not null,
  category text not null,
  department text not null,
  description text not null,
  "photoUrl" text,
  priority text not null,
  status text not null,
  "assignedTo" text,
  "assignedAt" timestamptz,
  "slaDueAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  rating int,
  "ratingComment" text,
  "holdReason" text,
  "disputeReason" text,
  "resolutionPhoto" text,
  "resolutionNote" text,
  "resolvedAt" timestamptz
);

create table if not exists tech_statuses (
  "userId" text primary key,
  "currentStatus" text not null,
  department text not null,
  "rotationPosition" int not null,
  "lastAssignedAt" timestamptz
);

create table if not exists token_history (
  id text primary key,
  "tokenId" text not null,
  "fromStatus" text not null,
  "toStatus" text not null,
  "actorId" text not null,
  "actorName" text not null,
  "actorRole" text not null,
  note text,
  timestamp timestamptz not null default now()
);

create table if not exists assignment_logs (
  id text primary key,
  "tokenId" text not null,
  "technicianId" text not null,
  method text not null,
  "actorId" text not null,
  "actorName" text not null,
  timestamp timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  "tokenId" text not null,
  channel text not null,
  recipient text not null,
  "sentAt" timestamptz not null default now(),
  status text not null,
  message text not null
);

create table if not exists pointers (
  department text primary key,
  position int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security: enabled with an open policy for now so the app works
-- immediately. This means anyone with your anon key (i.e. anyone who can
-- load your site) can read/write these tables — fine for getting this
-- working, but revisit before this handles anything truly sensitive. Once
-- you add real user authentication, replace the "true" policies below with
-- rules based on auth.uid() / role.
-- ─────────────────────────────────────────────────────────────────────────
alter table users enable row level security;
alter table tokens enable row level security;
alter table tech_statuses enable row level security;
alter table token_history enable row level security;
alter table assignment_logs enable row level security;
alter table notifications enable row level security;
alter table pointers enable row level security;

create policy "open access" on users for all using (true) with check (true);
create policy "open access" on tokens for all using (true) with check (true);
create policy "open access" on tech_statuses for all using (true) with check (true);
create policy "open access" on token_history for all using (true) with check (true);
create policy "open access" on assignment_logs for all using (true) with check (true);
create policy "open access" on notifications for all using (true) with check (true);
create policy "open access" on pointers for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Enable Realtime on every table (Database -> Replication in the Supabase
-- dashboard does the same thing — this is the SQL equivalent).
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table tokens;
alter publication supabase_realtime add table tech_statuses;
alter publication supabase_realtime add table token_history;
alter publication supabase_realtime add table assignment_logs;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table pointers;

-- ─────────────────────────────────────────────────────────────────────────
-- Seed data — same starting data your app used to hardcode in mockDb.ts.
-- ─────────────────────────────────────────────────────────────────────────
insert into users (id, name, email, role, phone, status, department, "createdAt") values
  ('admin-1', 'Vikas Mehra', 'vikas.mehra@aai.aero', 'admin', '+919876543210', 'active', 'IT Helpdesk', now() - interval '30 days'),
  ('disp-1', 'Rajesh Sharma', 'rajesh.sharma@aai.aero', 'dispatcher', '+919876543211', 'active', 'IT Helpdesk', now() - interval '30 days'),
  ('tech-1', 'Aman Sharma', 'aman.s@aai.aero', 'technician', '+919911001101', 'active', 'IT Helpdesk', now() - interval '15 days'),
  ('tech-2', 'Neha Gupta', 'neha.g@aai.aero', 'technician', '+919911001102', 'active', 'IT Helpdesk', now() - interval '15 days'),
  ('tech-3', 'Rohan Das', 'rohan.d@aai.aero', 'technician', '+919911001103', 'active', 'IT Helpdesk', now() - interval '15 days'),
  ('tech-4', 'Vikram Malhotra', 'vikram.m@aai.aero', 'technician', '+919911001104', 'active', 'IT Helpdesk', now() - interval '15 days'),
  ('tech-5', 'Priya Patel', 'priya.p@aai.aero', 'technician', '+919911001105', 'active', 'IT Helpdesk', now() - interval '15 days'),
  ('tech-6', 'Suresh Kumar', 'suresh.k@aai.aero', 'technician', '+919911001106', 'active', 'Electrical', now() - interval '15 days'),
  ('tech-7', 'Rajesh Yadav', 'rajesh.y@aai.aero', 'technician', '+919911001107', 'active', 'Plumbing', now() - interval '15 days'),
  ('tech-8', 'Sunita Rao', 'sunita.r@aai.aero', 'technician', '+919911001108', 'active', 'HVAC', now() - interval '15 days')
on conflict (id) do nothing;

insert into tech_statuses ("userId", "currentStatus", department, "rotationPosition") values
  ('tech-1', 'available', 'IT Helpdesk', 1),
  ('tech-2', 'available', 'IT Helpdesk', 2),
  ('tech-3', 'available', 'IT Helpdesk', 3),
  ('tech-4', 'available', 'IT Helpdesk', 4),
  ('tech-5', 'available', 'IT Helpdesk', 5),
  ('tech-6', 'available', 'Electrical', 1),
  ('tech-7', 'available', 'Plumbing', 1),
  ('tech-8', 'available', 'HVAC', 1)
on conflict ("userId") do nothing;

insert into tokens (id, "trackingId", "complainantName", "complainantContact", category, department, description, priority, status, "assignedTo", "assignedAt", "slaDueAt", "createdAt", "updatedAt", rating, "ratingComment", "resolutionNote", "resolutionPhoto") values
  ('token-1', 'TKN-8421', 'Capt. Arpit', 'arpit.air@indigo.in', 'Network & WiFi Access', 'IT Helpdesk', 'Indigo check-in counter 4 WiFi disconnected. Flight boarding delayed.', 'CRITICAL', 'VERIFIED_CLOSED', 'tech-1', now() - interval '12 hours', now() - interval '8 hours', now() - interval '12 hours', now() - interval '9 hours', 5, 'Quick response, fixed within 15 minutes after technician arrived.', 'Replaced ethernet patch cord under the boarding counter switch.', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80'),
  ('token-2', 'TKN-3209', 'Anil Kapoor', '+919812345678', 'AC Cooling & Ventilation', 'HVAC', 'T3 Arrivals area Gate 15 is extremely hot. Passengers complaining about air conditioning.', 'HIGH', 'IN_PROGRESS', 'tech-8', now() - interval '2 hours', now() + interval '4 hours', now() - interval '2.5 hours', now() - interval '2 hours', null, null, null, null),
  ('token-3', 'TKN-9182', 'Sanjay Singhal', 'sanjay.s@aai.aero', 'Hardware & Terminal PCs', 'IT Helpdesk', 'FIDS display screen at Gate 26 showing blue screen error.', 'MEDIUM', 'ON_HOLD', 'tech-2', now() - interval '5 hours', now() + interval '3 hours', now() - interval '6 hours', now() - interval '4 hours', null, null, null, null),
  ('token-4', 'TKN-4180', 'Meenakshi Iyer', 'meenakshi@airindia.in', 'Software & System Access', 'IT Helpdesk', 'New officer unable to log into the Departure Control System (DCS). Credentials locked.', 'LOW', 'NEW', null, null, now() + interval '22 hours', now() - interval '2 hours', now() - interval '2 hours', null, null, null, null)
on conflict (id) do nothing;

update tokens set "holdReason" = 'Waiting for replacement HDMI controller board from stores.' where id = 'token-3';

insert into token_history (id, "tokenId", "fromStatus", "toStatus", "actorId", "actorName", "actorRole", note, timestamp) values
  ('hist-1', 'token-1', 'NONE', 'SUBMITTED', 'public', 'Capt. Arpit', 'complainant', null, now() - interval '12 hours'),
  ('hist-2', 'token-1', 'SUBMITTED', 'NEW', 'system', 'Auto Assignment', 'system', null, now() - interval '12 hours'),
  ('hist-3', 'token-1', 'NEW', 'ASSIGNED', 'system', 'Auto Assignment', 'system', 'Auto-assigned to Aman Sharma (Rotation Pos: 1)', now() - interval '11.9 hours'),
  ('hist-4', 'token-1', 'ASSIGNED', 'IN_PROGRESS', 'tech-1', 'Aman Sharma', 'technician', 'Arrived at Counter 4, investigating switch connection.', now() - interval '11.5 hours'),
  ('hist-5', 'token-1', 'IN_PROGRESS', 'RESOLVED', 'tech-1', 'Aman Sharma', 'technician', 'Replaced faulty patch cord. Network connection restored, checked counter dashboard.', now() - interval '11 hours'),
  ('hist-6', 'token-1', 'RESOLVED', 'VERIFIED_CLOSED', 'admin-1', 'Vikas Mehra', 'admin', 'Called complainant to verify. Confirmed working fine.', now() - interval '9 hours')
on conflict (id) do nothing;
