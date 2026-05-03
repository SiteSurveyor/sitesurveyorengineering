-- Migration: 20260503120001 — public enum types (greenfield baseline).

begin;

DO $$ BEGIN 
  create type public.workspace_type as enum ('personal', 'business');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN 
  create type public.workspace_member_role as enum (
  'owner',
  'admin',
  'ops_manager',
  'finance',
  'sales',
  'technician',
  'viewer'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN 
  create type public.workspace_member_status as enum ('active', 'invited', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.organization_type as enum (
  'client',
  'vendor',
  'government',
  'partner',
  'lead',
  'subcontractor'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.project_status as enum (
  'draft',
  'active',
  'completed',
  'on_hold',
  'archived'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.job_status as enum (
  'planned',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.assignment_status as enum (
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.quote_status as enum (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.asset_kind as enum (
  'instrument',
  'vehicle',
  'equipment',
  'other'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.asset_status as enum (
  'available',
  'deployed',
  'maintenance',
  'retired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.calibration_status as enum (
  'scheduled',
  'passed',
  'failed',
  'expired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.attachment_visibility as enum (
  'private',
  'workspace',
  'public'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.notification_status as enum (
  'unread',
  'read',
  'archived'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  create type public.license_tier as enum ('free', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  create type public.license_status as enum (
    'trialing',
    'active',
    'past_due',
    'suspended',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

commit;
