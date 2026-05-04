-- Migration: 20260504120000 — add is_global flag to marketplace_listings and professionals.

begin;

alter table public.marketplace_listings
  add column if not exists is_global boolean not null default false;

alter table public.professionals
  add column if not exists is_global boolean not null default false;

commit;
