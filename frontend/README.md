# SiteSurveyor Frontend

Frontend client for SiteSurveyor, built with React, TypeScript, and Vite.

## Scripts

- `npm run dev` - start local dev server.
- `npm run build` - type-check and build for production.
- `npm run lint` - run ESLint.
- `npm run test` - run unit tests with Vitest.
- `npm run preview` - preview production build.

## Environment

Create `.env` in this directory:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Key Folders

- `src/pages` - feature pages and route-level screens.
- `src/lib/repositories` - Supabase data access layer.
- `src/features` - workspace shells, navigation, and view registries.
- `src/components` - reusable UI building blocks.

## Testing

The frontend uses Vitest for lightweight unit coverage.
