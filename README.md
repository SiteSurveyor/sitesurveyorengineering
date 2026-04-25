# SiteSurveyor Engineering

SiteSurveyor is a multi-tenant survey operations platform built with a React frontend,
Supabase backend, and optional Tauri desktop shell.

## Repository Structure

- `frontend`: React + TypeScript + Vite application.
- `supabase`: SQL migrations and backend architecture docs.
- `backend`: Tauri wrapper for desktop packaging.

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Supabase CLI
- Rust toolchain (only required for Tauri desktop builds)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend (Supabase)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Environment Variables

Create `frontend/.env` with:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never place service-role credentials in frontend environment files.

## Quality Checks

From `frontend`:

```bash
npm run lint
npm run build
npm run test
```
