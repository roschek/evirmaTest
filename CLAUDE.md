# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run these npm scripts to develop, build, test, and lint:

- `npm run dev` — Start the Vite development server
- `npm run build` — Compile TypeScript and build for production
- `npm run preview` — Preview the production build locally
- `npm run lint` — Run ESLint on all files
- `npm run typecheck` — Run TypeScript type checker without emitting
- `npm run test` — Run all tests once (vitest)
- `npm run test:watch` — Run tests in watch mode
- `npm run format` — Format code with Prettier

To run a single test file:
```bash
npx vitest run src/shared/lib/media-url/media-url.test.ts
```

## Architecture (FSD)

This project follows **Feature-Sliced Design (FSD)** with five layers (no `widgets`, no router):

- **`app`** — Application root, initialization, global context, entry point
- **`pages`** — Page-level components (full-page views)
- **`features`** — Business-logic features (e.g., article search, photo selection modal)
- **`entities`** — Domain models and queries (e.g., Article, Photo via RTK Query)
- **`shared`** — Reusable utilities, components, and libraries used across layers

### Import Direction

Imports flow downward only: `app → pages → features → entities → shared`. Never import upward (shared into app) or sideways (features into features). Each slice exposes a public API via `index.ts`; always import through the barrel, never direct paths into the slice.

### State Management

- **Server state:** RTK Query only (in `entities` layer, exposed via api slices)
- **UI state:** Local React state (e.g., photo selection checkboxes, modal open/close)

## Code Style

- **TypeScript:** Strict mode enforced; no `any`
- **RTK Query:** Api slices named in camelCase (e.g., `productCardApi`); hooks follow `useGetCardQuery` naming
- **File naming:**
  - Directories: `kebab-case`
  - Components: `PascalCase` (e.g., `PhotoGallery.tsx`)
  - Utils and hooks: `camelCase` (e.g., `useMediaUrl.ts`)
- **Testing:** Pure functions in `shared/lib` include colocated `*.test.ts` files; use Vitest + React Testing Library

## Media Approach

Photo and video URLs are built by `shared/lib/media-url` using article number and CDN ranges. Downloads are handled via JSZip in `shared/lib/download` for batching multiple files.

**Known WB CORS caveat:** Direct CDN requests from browser may be blocked. Implement a proxy fallback if CORS errors occur.

## Agents

When working on tasks, invoke these agents as needed:

| Agent | Purpose | When to use |
|-------|---------|------------|
| `orchestrator` | Leads the full dev cycle — breaks tasks into steps, delegates to developer and tester | At the start of a large task; after each implementation step |
| `developer` | Implements FSD slices, RTK Query, and MUI components following code style | For writing code, creating tests, committing work |
| `tester` | Verifies work — runs tests, lint, typecheck, and tests UI flows in browser | After developer completes a step; before merging |
