# Supabase backend structure for SiteSurveyor

This project uses **Supabase** as the backend, database, auth provider, and file storage layer.

## Architecture principles

### 1. Workspace-first multi-tenancy
All business data belongs to a `workspace`.

- A **personal** account is a workspace with `type = 'personal'`
- A **business** account is a workspace with `type = 'business'`
- A user can belong to multiple workspaces through `workspace_members`

This keeps the data model consistent across:
- projects
- scheduling
- dispatch
- assets
- quotes
- invoices
- files
- future marketplace features

### 2. Auth is handled by Supabase Auth
`auth.users` remains the identity source of truth.

A database trigger should automatically create:
- a `profiles` row
- the user's default workspace
- the owner membership
- workspace settings

This means user signup stays simple while the app backend remains tenant-aware from day one.

### 3. Row Level Security is the security boundary
All client-facing tables should use RLS.

Access should be controlled through helper functions such as:
- `is_workspace_member(workspace_id)`
- `can_manage_workspace(workspace_id)`
- `can_manage_operations(workspace_id)`
- `can_manage_finance(workspace_id)`
- `can_manage_sales(workspace_id)`
- `can_manage_assets(workspace_id)`

This keeps policy logic reusable and avoids repeating large RLS conditions across many tables.

### 4. Storage is bucket-based and workspace-scoped
Files should be written into bucket paths using the workspace ID as the first path segment.

Recommended conventions:
- `avatars/<user_id>/avatar.png`
- `workspace-private/<workspace_id>/projects/<project_id>/...`
- `workspace-public/<workspace_id>/...`
- `generated-docs/<workspace_id>/quotes/...`

### 5. Keep backend logic split by responsibility
Use the database for:
- tenancy
- RLS
- transactional business logic
- relational integrity
- reporting views

Use Edge Functions for:
- external APIs
- emails
- payment webhooks
- PDF generation
- background tasks
- integrations

---

## Recommended schema domains

### Identity and tenancy
Core foundation tables:

- `profiles`
- `workspaces`
- `workspace_settings`
- `workspace_members`
- `workspace_invitations`

### CRM and project hub
Operational customer and project data:

- `organizations`
- `contacts`
- `projects`
- `project_members`
- `project_contacts`

### Operations
Scheduling, dispatch, and field execution:

- `jobs`
- `job_events`
- `job_assignments`
- `job_assignment_members`
- `job_assignment_assets`

### Assets and calibration
Fleet and instrument management:

- `assets`
- `asset_calibrations`
- `asset_maintenance_events`

### Finance
Revenue and billing records:

- `quotes`
- `quote_items`
- `invoices`
- `invoice_items`
- `payments`

### Files and notifications
Cross-cutting support tables:

- `attachments`
- `notifications`

### Internal-only schemas
For secure backend operations:

- `private.webhook_events`
- `audit.activity_log`

---

## Current migration strategy

The first foundational migration should live at:

- `supabase/migrations/0001_foundation.sql`

It should create:

- extensions
- enums
- base tables
- indexes
- helper functions
- signup triggers
- RLS policies
- storage buckets
- storage policies
- core RPC functions

Recommended RPC functions:

- `create_business_workspace(workspace_name, workspace_slug)`
- `accept_workspace_invitation(target_invitation_token)`
- `set_default_workspace(target_workspace_id)`

---

## Frontend integration structure

Supabase frontend scaffolding should live in:

- `frontend/src/lib/supabase/client.ts`
- `frontend/src/lib/supabase/types.ts`
- `frontend/src/lib/auth/session.ts`
- `frontend/src/lib/auth/app-user.ts`
- `frontend/src/lib/repositories/profiles.ts`
- `frontend/src/lib/repositories/workspaces.ts`

### Suggested responsibilities

#### `client.ts`
Creates the browser Supabase client using:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### `types.ts`
Contains database typings.

Initially, handwritten types are acceptable for the core tables, but these should later be replaced with generated types from Supabase.

#### `session.ts`
Handles:
- sign in
- sign up
- sign out
- session retrieval
- auth state subscription

#### `app-user.ts`
Builds the app-level authenticated context:
- session
- profile
- default workspace
- workspace memberships

#### `repositories/*.ts`
Contains table-specific data access functions.

Examples:
- `getMyProfile()`
- `updateMyProfile()`
- `getMyWorkspaces()`
- `getDefaultWorkspace()`
- `switchDefaultWorkspace()`

---

## Setup workflow

### 1. Create the frontend environment file
Create a local env file from the example:

- `frontend/.env.example`
- `frontend/.env`

Example public variables:

- `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-supabase-anon-key`

### 2. Keep secret keys out of the frontend
Do **not** put the service role key in Vite or any client-side file.

Use the service role key only in:
- secure backend environments
- Supabase Edge Functions
- private server-side tooling

### 3. Link the Supabase project
Typical workflow:

1. Authenticate with Supabase
2. Link the local project to the remote project
3. Push migrations

Common flow:

- `supabase login`
- `supabase link --project-ref YOUR_PROJECT_REF`
- `supabase db push`

### 4. Generate database types
After the schema is deployed, replace handwritten types with generated types:

- `supabase gen types typescript --linked --schema public > frontend/src/lib/supabase/types.ts`

This keeps the frontend aligned with the actual database schema.

---

## Security rules

### Never trust the client for authorization
The client may know who the user is, but only the database should decide what the user can read or write.

### Every tenant-owned row should have `workspace_id`
This is the core boundary for multi-tenancy.

### Avoid direct unrestricted inserts for sensitive workflows
Prefer RPC or secure backend functions for actions like:
- creating business workspaces
- accepting invitations
- creating linked finance records
- publishing generated documents

### Use soft-delete or archived states where appropriate
For business records, prefer:
- `archived_at`
- status transitions

over hard deletes.

### Keep auditability in mind
Important actions should be traceable:
- invite accepted
- workspace created
- quote accepted
- invoice paid
- assignment changed
- calibration updated

---

## Suggested implementation phases

### Phase 1 — Foundation
Build first:

- auth integration
- profiles
- workspaces
- workspace memberships
- workspace settings
- invitations
- RLS helper functions
- storage structure

### Phase 2 — Core operations
Then add:

- organizations
- contacts
- projects
- jobs
- schedule
- dispatch
- assets
- calibration tracking

### Phase 3 — Revenue
Then add:

- quotes
- invoices
- payments
- generated documents
- finance automation

### Phase 4 — Advanced platform features
Then add:

- marketplace
- public professional profiles
- public job board
- advanced analytics
- integrations

---

## Non-negotiables

- All business data must be scoped by `workspace_id`
- Personal and business accounts must use the same workspace model
- The anon key can be used in the frontend
- The service role key must never be shipped to the frontend
- All schema changes should be managed through migrations
- Types should eventually be generated from the live schema
- RLS should be enabled on every client-facing table
- Sensitive workflows should move through RPC or secure backend logic

---

## Summary

The cleanest Supabase architecture for SiteSurveyor is:

**`auth.users` → `profiles` → `workspaces` → `workspace_members`**

with all business data keyed by `workspace_id`, RLS centered on workspace membership, file storage scoped by workspace, and operational logic split cleanly between SQL, RLS, RPC, and Edge Functions.

This gives the project:
- a strong multi-tenant foundation
- consistent auth and authorization
- clean separation of concerns
- room to scale from prototype to production