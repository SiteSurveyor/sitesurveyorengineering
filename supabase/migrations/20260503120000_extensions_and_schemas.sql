-- Migration: 20260503120000 — extensions and internal schemas (greenfield baseline).

begin;

create extension if not exists pgcrypto;

create schema if not exists private;
create schema if not exists audit;

revoke all on schema private from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;

commit;
