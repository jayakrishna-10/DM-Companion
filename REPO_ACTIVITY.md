# DM Companion — Repository Activity Log

> **Last Updated**: 2026-05-22 (Round 1 fixes applied)
> **Purpose**: Track completed and pending work so development can resume from where it left off.

---

## Project Overview

**DM Companion** is a PWA (Progressive Web App) for chemical water treatment plant operators to log daily activities, complaints, abnormalities, and resolved complaints. It features offline-first storage via sql.js + IndexedDB, Notion API sync, CSV import/export, and a dark-themed mobile UI.

**Tech Stack**: React 19 + Vite + TypeScript + Tailwind CSS v4 + sql.js + Framer Motion + React Router v7

**Deploy Target**: Vercel (static SPA with SPA rewrite rules)

---

## Completed Fixes

| # | Fix | Files Changed | Date | Notes |
|---|-----|---------------|------|-------|
| — | *Initial review* | All source files | 2026-05-22 | Full codebase review by AI orchestrator + @oracle (architecture) + @designer (UI/UX) + @explorer (patterns/bugs) |
| C1 | **Fixed edit flow** — `NewEntry.tsx` now reads `?edit=` param, fetches entry, passes to `EntryForm` with `editId`. `EntryForm` calls `editEntry` when editing. `History.tsx` edit button navigates to edit page. | `NewEntry.tsx`, `EntryForm.tsx`, `History.tsx`, `database.ts` | 2026-05-22 | Added `getEntry(id)` to database.ts. TypeScript compiles cleanly. |
| C2 | **Fixed sync logic** — Only successfully synced entries are marked as synced. Partial failures now correctly show `error` status and failed entries retry on next sync. | `useDatabase.tsx` | 2026-05-22 | Tracks `syncedIds` array. Calls `markAsSynced(syncedIds)` only. Sets status to `error` if any entries failed. |
| C3 | **Switched API key storage to sessionStorage** — Key is cleared when browser session ends. More secure than `localStorage`. | `useSync.tsx` | 2026-05-22 | Interim fix. **Proper fix** still needed: Vercel serverless function proxy. |
| H1 | **Fixed saveDatabase transaction completion** — `saveDatabase()` now returns `Promise<void>` that resolves on `tx.oncomplete`, guaranteeing data is persisted before resolving. | `database.ts` | 2026-05-22 | Also added `putReq.onerror` handler for robust error reporting. |
| H2 | **Fixed IndexedDB connection churn** — Added `let idbDb: IDBDatabase | null = null` module-level variable. `openIDB()` helper caches and reuses connection. | `database.ts` | 2026-05-22 | `onupgradeneeded` ensures object store exists in both load and save paths. |
| H3 | **Added Content Security Policy** — Added CSP meta tag to `index.html` allowing `'self'`, `unsafe-eval` (for WebAssembly), and Notion API. | `index.html` | 2026-05-22 | `script-src 'self' 'unsafe-eval'; connect-src 'self' https://api.notion.com;` etc. |
| H4 | **Switched to HashRouter** — Replaced `BrowserRouter` with `HashRouter` so PWA refreshes on `/history` or `/new` don't 404 in standalone mode. | `App.tsx` | 2026-05-22 | No other routing logic needed changes. |
| H5 | **Fixed service worker registration** — Removed manual inline SW registration from `index.html`. Changed VitePWA condition from `ENABLE_PWA=true` to `DISABLE_PWA !== 'true'` so PWA is enabled by default. | `index.html`, `vite.config.ts` | 2026-05-22 | VitePWA auto-injects registration when enabled. No more 404 on `/sw.js` in dev. |
| H6 | **Made CSV import atomic** — Wrapped `importFromCSV` in `BEGIN TRANSACTION` / `COMMIT`. On error, `ROLLBACK` prevents partial data. | `database.ts` | 2026-05-22 | Returns 0 imported on rollback. |
| H7 | **Replaced manual CSV parser with papaparse** — Removed ~50 lines of fragile hand-rolled parsing. Added `papaparse` + `@types/papaparse` dependencies. | `Settings.tsx`, `package.json` | 2026-05-22 | Uses `Papa.parse(text, { header: true, skipEmptyLines: true })`. Maps header-keyed rows to expected format. |
| M3 | **Removed viewport zoom blocking** — Removed `maximum-scale=1.0` and `user-scalable=no` from viewport meta tag. | `index.html` | 2026-05-22 | Improves accessibility for low-vision users. |

---

## Pending Fixes

### 🔴 Critical (Blockers — fix before production)

| # | Issue | File(s) | Plan |
|---|-------|---------|------|
| C3-proper | **Notion API key still on client** — `sessionStorage` is an interim fix. The API key should never touch the client. | `useSync.tsx`, new `api/notion-sync.ts` | Create Vercel serverless function `/api/notion-sync` that holds the key in env vars. Client sends entries to this endpoint. Server forwards to Notion API. |

### 🟡 High Priority (Fix before adding features)

| # | Issue | File(s) | Plan |
|---|-------|---------|------|
| H8 | **Add `beforeunload` flush as backup** — `visibilitychange` handles tab switch, but `beforeunload` is needed for page close on some browsers. | `database.ts` | Add `window.addEventListener('beforeunload', ...)` that forces immediate `saveDatabase()` (best-effort synchronous fallback). |

### 🟢 Medium Priority (Accessibility, performance, maintainability)

| # | Issue | File(s) | Plan |
|---|-------|---------|------|
| M1 | No visible focus indicators on interactive elements | `Button.tsx`, `EntryRow.tsx`, `Sheet.tsx`, `FilterPill` | Add `focus-visible:ring-2 focus-visible:ring-accent/50` |
| M2 | Toasts invisible to screen readers | `Toaster.tsx` | Add `aria-live="polite"` container, `role="status"` / `role="alert"` on toasts |
| M4 | `getHierarchy()` called on every render | `EntryForm.tsx` | Wrap in `useMemo` |
| M5 | `searchResults` IIFE recalculates on every render | `EntryForm.tsx` | Wrap in `useMemo` |
| M6 | Duplicate `formatDate()` function | `Home.tsx`, `History.tsx` | Extract to `src/lib/format.ts` |
| M7 | Duplicate `getTodayString()` pattern | Multiple files | Extract to `src/lib/date.ts` |
| M8 | No error boundaries | `App.tsx` | Wrap routes in ErrorBoundary |
| M9 | Memory leaks — toast timeouts and `isSubmitting` timeout not cleared on unmount | `Toaster.tsx`, `EntryForm.tsx` | Store timeout IDs, clear in cleanup |
| M10 | Dead dependencies (`fuse.js`, `@tanstack/react-virtual`, `@types/react-router-dom`) | `package.json` | Remove |
| M12 | `rowToEntry` uses positional indexing — fragile to schema changes | `database.ts` | Use named column access or explicit column map |
| M13 | `getEntriesByDate` loads all entries with no LIMIT | `database.ts` | Add pagination or LIMIT for scale |

### 🔵 Low Priority (Nice to have)

| # | Issue | File(s) | Plan |
|---|-------|---------|------|
| L1 | `SyncIndicator` ternary is a no-op | `SyncIndicator.tsx` | Show timestamp when available |
| L2 | `SegmentedControl` hardcoded to 4 items at 25% | `SegmentedControl.tsx` | Compute from `NOTE_TYPES.length` |
| L3 | Double scale on buttons (CSS + Framer Motion) | `Button.tsx` | Remove CSS `active:scale` |
| L4 | No `Escape` key handler on Sheet | `Sheet.tsx` | Add `useEffect` keydown listener |
| L5 | `importFromCSV` silently swallows all errors | `database.ts` | Log errors, return error count |
| L6 | Notion URL may be wrong (`notion.so` vs `www.notion.so`) | `EntryDetailSheet.tsx` | Verify and fix URL format |
| L7 | No `beforeinstallprompt` handler | `App.tsx` or new component | Capture event, show install banner |
| L8 | No offline indicator/fallback UI | `AppShell.tsx` | Show banner when `syncStatus === 'offline'` |
| L9 | No tests | — | Add unit tests for database layer (requires refactoring singleton) |

---

## Architecture Notes

### Database Layer (`src/db/database.ts`)
- Uses **module-level singletons** (`let db: Database | null = null` for sql.js, `let idbDb: IDBDatabase | null = null` for IndexedDB). This makes unit testing impossible without refactoring to a factory pattern.
- All SQL uses **parameterized queries** (`?` placeholders) — no injection risk.
- IndexedDB stores the sql.js binary under key `'dm-companion-db'` in object store `'database'`.
- `scheduleSave()` debounces saves by 300ms.
- `saveDatabase()` now waits for IndexedDB transaction to complete (returns `Promise<void>`).
- `openIDB()` reuses the IndexedDB connection instead of opening a new one each time.
- `visibilitychange` listener flushes pending saves immediately when user switches tabs.
- `importFromCSV()` is wrapped in `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` for atomicity.

### State Management (`src/hooks/useDatabase.tsx`)
- Single React Context (`DatabaseProvider`) wraps the app.
- Exposes: `entries` (Map by date), `counts`, `syncStatus`, `addEntry`, `editEntry`, `removeEntry`, `search`, `filterEntries`, `getHierarchy`, `importData`, `exportData`, `syncToNotion`.
- `syncToNotion` makes direct `fetch()` calls to Notion API from the client.

### Notion Sync Security
- **Current**: API key stored in `localStorage`, client calls Notion API directly.
- **Interim fix**: Use `sessionStorage` (key cleared on session end).
- **Proper fix**: Vercel serverless function proxy. The client sends entries to `/api/notion-sync`, the server holds the API key in env vars and forwards to Notion. This keeps the key completely off the client.

### Routing
- Currently `BrowserRouter`. For a static SPA on Vercel, `HashRouter` is safer because refreshes on `/history` won't 404 (no server-side route handling needed).
- `vercel.json` already has SPA rewrite rules, but `HashRouter` is more robust for PWA standalone mode.

### PWA
- `vite-plugin-pwa` is **enabled by default** (`DISABLE_PWA !== 'true'`). Previously was opt-in via `ENABLE_PWA=true`.
- `index.html` no longer has manual SW registration — VitePWA auto-injects it when enabled.
- Manifest and icons are in `public/`.
- Uses `HashRouter` so refreshes in standalone PWA mode don't 404.

---

## Environment / Deployment Notes

- **Build command**: `npm run build` (runs `tsc -b && vite build`)
- **Dev command**: `npm run dev`
- **Vercel**: PWA is enabled by default. Set `DISABLE_PWA=true` only if you need to disable it.
- **Notion Integration**: Currently requires user to paste API key + Database ID in Settings page. These are stored in `sessionStorage` (cleared on session end). **Proper fix**: Vercel serverless function proxy to keep key server-side.

---

## How to Update This Document

When a fix is completed:
1. Move the item from **Pending Fixes** to **Completed Fixes**.
2. Add the files changed, date, and any notes.
3. Update **Last Updated** at the top.

---

## Contact / Context

- Repository: `C:\Users\SkullSaint(S)\Documents\Claude's Playground\DM-Companion`
- Review performed by: AI coding orchestrator + @oracle (architecture) + @designer (UI/UX) + @explorer (patterns/bugs)
- Review date: 2026-05-22
