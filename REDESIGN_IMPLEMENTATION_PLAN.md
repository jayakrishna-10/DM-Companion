# DM Companion complete redesign blueprint and implementation plan

Date: 2026-05-29  
Scope: Structural redesign plan only. No product feature, utility, workflow, route, data model, sync path, offline behavior, import/export capability, diagnostics capability, or plant-operations use case should be reduced or removed.

---

## 1. Product understanding

DM Companion is a mobile-first PWA for DM/CWTP plant operators. Its core job is to let an operator capture shift log events, classify them, connect them to plant assets, track unresolved complaints/abnormalities, attach equipment photos, and sync the local field record with Notion when online.

Current stack and architecture:

- React 19 + TypeScript + Vite.
- Tailwind CSS v4 with custom tokens in `src/index.css`.
- Local-first sql.js SQLite persisted to IndexedDB.
- Vercel serverless functions under `api/` for Notion read/write/photo integration.
- Hash-based routing for PWA/static-host compatibility.
- Framer Motion for sheets, navigation indicators, card/list transitions, and small gestures.
- Fuse.js and `@tanstack/react-virtual` are installed and should be used in the redesign where appropriate.

Important validation note from exploration: the local Vite dev overlay currently reports `@tailwindcss/vite:generate:serve` cannot resolve `@fontsource/inter/400.css` from `src/index.css`. The redesign implementation should start by restoring a clean local run/build baseline before visual QA.

---

## 2. Non-negotiable preservation requirements

The redesign must preserve all of these capabilities:

1. Local-first operation with IndexedDB-backed SQLite.
2. Offline creation, editing, deletion, photo capture, searching, history review, issue tracking, asset review, and diagnostics review.
3. Notion pull, push, update, deletion reconciliation, schema/tag sync, duplicate protection, and photo backup.
4. Existing routes: `/`, `/new`, `/multi`, `/profiles`, `/history`, `/issues`, `/equipment`, `/logs`, `/settings`.
5. Existing entry fields: note, date, note type, object, object group, object type, source, Notion page ID, synced state, created/updated timestamps.
6. Existing default note types: Activity, Complaints, Abnormality, Resolved Complaint.
7. Dynamic user-created note types, sources, object types, object groups, and objects.
8. Current plant hierarchy model: Type -> Group -> Object.
9. Multi-input paste parsing, auto-tagging, review, edit, remove, and submit all.
10. Single-entry create/edit/duplicate/delete flows.
11. Entry detail sheet with full note, metadata, Notion link, edit, duplicate, delete, and object navigation.
12. Timeline grouping by date and sub-entry parsing from bullet lines.
13. History search and filters.
14. Issue open/resolved tracking for Complaints and Abnormalities.
15. Resolution detection by matching Resolved Complaint entries to the same object.
16. Profiles topology grid with type/group/object matrix and severity states.
17. Equipment-specific timeline page addressable by `?object=`.
18. Photo capture from mobile camera and file picker.
19. Dual-resolution photo storage: SD local display and HD Notion backup.
20. Photo tags, quick tags, delete photo, sync status indicators, and photo sync logs.
21. CSV export and CSV import.
22. Notion connection test and manual sync.
23. Clear local data and clear logs utilities.
24. Sync status indicator, sync logs, database stats, and photo push history.
25. PWA manifest/service-worker behavior.

---

## 3. Current feature, use case, visual-state, and redesign inventory

### 3.1 App shell, navigation, and app identity

**Current utility**

- Provides the persistent app frame through `AppShell`.
- Routes are rendered inside a sticky header and fixed bottom tab bar.
- Header shows `DM Companion` and a sync indicator that can trigger manual sync.
- Bottom navigation exposes Home, Multi, Profiles, History, Issues, and Logs.
- Settings exists as a route but is not present in the bottom nav.

**Current visual state**

- Dark mobile app shell with glass header and glass bottom navigation.
- Header height is compact, roughly 48px.
- Navigation is optimized for phone width and constrained to `max-w-lg`.
- Active tab is teal/blue-tinted with a small animated rounded indicator.
- Desktop mostly feels like a stretched phone except for Profiles.

**Ground-up redesign**

- Reframe the shell as an industrial command instrument rather than a generic mobile app.
- Mobile keeps thumb-zone bottom navigation, but increases touch target clarity and separates primary operational actions from passive navigation.
- Desktop gets a real left navigation rail plus a top command bar: global search, sync state, offline banner, and current shift context.
- Settings becomes discoverable from the command bar/profile/system area without crowding mobile navigation.
- Add route-aware page titles and breadcrumbs on desktop while preserving all existing URLs.

### 3.2 Home dashboard

**Current utility**

- Quick access to Add Log and Take Photo.
- Shows recently captured equipment photos.
- Shows today's entries first.
- Shows recent previous-date groups as collapsible sections.
- Opens entry detail sheet from timeline cards.
- Allows object chips/cards to navigate to the Equipment page.

**Current visual state**

- Single-column dark mobile dashboard.
- Two equal CTA buttons at the top.
- Photo strip is a horizontal snap carousel with square cards.
- Date sections use tiny uppercase mono labels and count pills.
- Empty state is plain text only.

**Ground-up redesign**

- Turn Home into the operator's shift dashboard.
- Make `Log event` the dominant action, with `Capture photo` as a secondary but still prominent field action.
- Add glanceable status capsules: today's entries, open complaints, open abnormalities, pending sync, pending photo backups.
- Convert photo strip into an equipment filmstrip with tag, timestamp, sync state, and quick inspect/delete actions.
- Use sticky date headers and a timeline that feels like an operations logbook: dense enough for plant use, but with clear severity rails and readable text.
- Empty state should be a composed first-run panel: “Start today's shift log,” “Capture equipment photo,” and “Sync with Notion.”

### 3.3 Single log entry creation, edit, duplicate, and delete

**Current utility**

- `/new` creates a single log entry.
- `?edit=id` loads an existing entry for editing.
- `?duplicate=id` pre-fills a new form from an existing entry.
- Form captures note type, note text, date, source, object type, object group, and object.
- Saves to local DB, refreshes entries, and triggers Notion sync.
- Delete is available from detail sheet.

**Current visual state**

- Form-first screen with compact labels and dark input surfaces.
- Note type uses a segmented pill control.
- Object selection is a multi-step search/select/add interface.
- Many labels are uppercase micro-text.
- Primary focus color is teal even though global accent tokens define blue/violet.

**Ground-up redesign**

- Redesign entry creation as a command-style capture flow optimized for a field operator under time pressure.
- Put the note textarea first, large and calm, because the note is the user's primary thought.
- Auto-detected note type and object should appear as confidence chips directly below the note, with one-tap accept/override.
- Replace stacked hierarchy fields with a breadcrumb builder: `Type -> Group -> Object`, each segment editable.
- Keep advanced manual hierarchy editing accessible but visually subordinate.
- Date and source should be compact shift metadata, not competing primary fields.
- Edit and duplicate modes should be visually obvious with a mode banner: `Editing entry #123` or `Duplicating from May 14`.
- Destructive delete should use a deliberate confirmation state with clear copy and accessibility support.

### 3.4 Auto-tagging and intelligent suggestions

**Current utility**

- Detects note type using keyword/regex patterns.
- Detects objects from hierarchy using exact, hyphenless, space-normalized, and shortened patterns.
- Suggests detected type/object in entry form.
- Multi-input applies auto-tagging to every parsed line before review.

**Current visual state**

- Suggestion appears as a small teal pill row.
- Suggestions are useful but visually feel like helper text rather than a major productivity feature.

**Ground-up redesign**

- Make auto-tagging feel like an operations co-pilot without implying unreliable AI magic.
- Suggestions should have three states: detected, applied, overridden.
- Show confidence through restrained UI language: `Detected asset: R5-F` and `Detected type: Complaint`.
- Allow keyboard and touch acceptance.
- For multiple object matches, show a ranked short list with the matched phrase highlighted.
- In review flows, mark entries needing human attention with a subtle amber review badge.

### 3.5 Entry detail sheet and timeline cards

**Current utility**

- Timeline cards show note type, date, note, object link, and source/object metadata.
- Bullet-like sublines are parsed into checklist-style sub-items.
- Detail sheet shows full entry fields, Notion link if synced, and edit/duplicate/delete actions.
- Object clicks navigate to `/equipment?object=...`.

**Current visual state**

- Timeline uses a left border with small absolute-positioned dots.
- Cards are dark bordered surfaces with colored note badges.
- Detail is a bottom sheet with a grabber and glassy dark surface.

**Ground-up redesign**

- Build a robust timeline primitive with CSS pseudo-elements instead of fragile dot offsets.
- Use severity/type stripes on the card edge rather than relying only on a small badge.
- Make cards scannable by separating event text, asset, source, date, and sync/Notion state.
- Support quick actions by long press/right click: edit, duplicate, copy note, delete.
- Detail sheet becomes an adaptive surface: bottom drawer on mobile, centered/side panel on desktop.
- Add focus trap, Escape close, return focus, and icon button labels.

### 3.6 Multi-input bulk entry

**Current utility**

- Paste a list of observations, activities, or complaints.
- Supports bullets, dashes, asterisks, numbered items, and plain newlines.
- Applies date and source to parsed lines.
- Auto-detects note type and object for each line.
- Review step allows editing each entry's type, note, equipment, date, and source.
- Can add new source, note type, object type, object group, and object inline.
- Can remove entries before submit.
- `Submit All` saves each valid entry and triggers sync per add.

**Current visual state**

- Two-step page: paste textarea, then collapsible card list.
- Sticky-ish top submit area in review.
- Dense mobile-first interface with many small labels, icons, and controls.
- Large review batches can become long and heavy.

**Ground-up redesign**

- Treat Multi as a batch processor.
- Input screen becomes a calm paste/drop zone with examples and parse rules visible in one compact helper block.
- Review screen gets a sticky batch summary: total parsed, ready, needs review, removed.
- Use `@tanstack/react-virtual` for large review lists.
- Show each parsed item as a compact review row by default; expand only when editing is needed.
- Preserve all inline editing and tag creation, but group them into progressive disclosure so routine batch submission is fast.
- Add keyboard shortcuts: Enter to parse, Ctrl/Cmd+Enter to submit ready batch, Escape to close expanded row.

### 3.7 History and search

**Current utility**

- Search all entries.
- Filter by note type.
- Display date-grouped timeline.
- Open detail sheet.
- Object links can navigate to Equipment page.

**Current visual state**

- Search input at top.
- Horizontal note-type filter pills.
- Same timeline/card visual language as Home.
- Mobile column layout.

**Ground-up redesign**

- Rename the experience conceptually to `Chronicle`, while preserving route and labels as appropriate.
- Search becomes a command/search bar with Fuse-powered fuzzy results across note, object, type, group, and source.
- Desktop layout gets a sticky left filter panel with type, source, date range, object type, sync state, and unresolved/resolved toggles.
- Mobile keeps a sticky horizontal filter rail.
- Large lists should be virtualized.
- Add result context snippets with matched terms highlighted.

### 3.8 Issues tracking

**Current utility**

- Finds complaint and abnormality entries.
- Marks complaints resolved when a Resolved Complaint entry references the same object.
- Shows summary counts for open complaints, open abnormalities, and resolved items.
- Toggle between open and resolved views.
- Opens detail sheet for issue cards.

**Current visual state**

- Three small summary stat cards.
- Tab toggle for Open/Resolved.
- Timeline/list cards reuse current dark surfaces.
- Severity indicated through red/orange/green color.

**Ground-up redesign**

- Rebuild as an alert console.
- Use large status dials or high-contrast stat blocks for open complaints, abnormalities, and resolved count.
- Sort open issues by severity, age, and affected asset.
- Show issue lifecycle: opened date, latest related activity, resolved match if any.
- Resolved items should visually calm down: lower opacity, green closure stamp, and optional collapse under date.
- Provide `Log resolution` quick action from an open issue, prefilled with the same asset and Resolved Complaint type.

### 3.9 Equipment asset page

**Current utility**

- Route accepts `?object=Name`.
- Shows selected object's type/group metadata.
- Filters object history by note type.
- Displays object-specific timeline.
- Provides back navigation.

**Current visual state**

- Compact asset header with pills and filter pills.
- Timeline below in same mobile column language.

**Ground-up redesign**

- Reframe as an asset file.
- Hero block shows object code/name, group, type, current severity, last activity, open issue count, and sync state.
- Timeline becomes the asset maintenance/event record.
- Add sticky `New log for this asset` action that opens `/new` with object fields prefilled.
- Add related photos for the selected asset/tag near the top.
- Desktop can show asset metadata and actions in a right-side summary panel.

### 3.10 Profiles / plant topology

**Current utility**

- Builds topology from hierarchy and entries.
- Shows type panels with code, object count, entry count, and severity.
- Shows group matrices of asset buttons.
- Computes severity from open complaints, abnormalities, and critical wording.
- Selecting an asset shows an asset detail sidebar timeline.
- Entry detail sheet supports edit/delete from the profile timeline.

**Current visual state**

- The strongest current page structurally.
- Uses a real two-column layout on large screens.
- Type panels and asset matrix use multiple accent colors.
- Severity dots/glows are present but small.

**Ground-up redesign**

- Make Profiles the centerpiece: `Asset command center`.
- Type panels become tactile industrial tiles with code, count, severity, and last activity.
- Group matrices use status-colored borders and small indicators instead of full background tints.
- Right detail panel becomes an asset dossier with timeline, quick log, related photos, and open issue summary.
- Keep all current severity logic, but make it explainable: hover/tap shows why an asset is critical/warning.
- On ultrawide, split into three columns: type list, group/object matrix, asset dossier.

### 3.11 Photo capture and photo management

**Current utility**

- Opened from Home.
- Supports camera capture with `capture="environment"` and multi-file picker.
- Compresses images to SD thumbnails and HD backup versions.
- Stores SD and HD in SQLite initially.
- Requires a tag/name.
- Offers quick tags from existing photo tags.
- Saves locally and queues Notion backup if online.
- Shows local SD cards in Home with size, sync/pending icon, and delete.
- After Notion photo sync, HD data can be cleared to save space.

**Current visual state**

- Photo capture uses a custom overlay instead of the shared Sheet component.
- Preview grid is functional and dark.
- Compression explanation is text-heavy.
- Photo cards are square, bordered, and compact.

**Ground-up redesign**

- Unify photo capture with the adaptive Sheet/Dialog system.
- Present capture as an inspection workflow: select/capture -> preview -> tag -> save/backup.
- Use a premium dark film/proof-sheet aesthetic.
- Make compression status visual: SD local copy, HD backup copy, Notion queue.
- Improve tag entry with recent tags, asset suggestions, and selected-asset prefill when launched from an asset page.
- Preserve multi-photo save and offline queue.

### 3.12 Settings and system preferences

**Current utility**

- Test Notion connection.
- Trigger manual sync.
- Export CSV.
- Import CSV.
- Clear local data with confirmation.
- Accessed via `/settings`.

**Current visual state**

- Admin page with sectioned cards and icon headers.
- Dark, compact, form-like layout.
- Danger action is present but not highly separated as a danger zone.

**Ground-up redesign**

- Reframe as System Preferences.
- Group into collapsible panels: Connection, Sync, Data portability, Local storage, Danger zone.
- Show Notion connection health with last successful sync, error state, and required environment configuration hints.
- CSV import becomes a drag/drop and file-picker zone with preview before commit.
- Export should show row count and export date.
- Danger zone should be visually separated and require deliberate confirmation.

### 3.13 Logs and diagnostics

**Current utility**

- Shows DB statistics: total entries, synced/unsynced entries, tags, photos, DB size.
- Shows sync history with pulled/pushed/failed/deleted/updated/tag counts, duration, status, and error.
- Shows photo push history with pushed/failed/size/duration/error.
- Can clear logs.

**Current visual state**

- Stat cards in a compact grid.
- Sync/photo logs rendered as dark cards with metric rows.
- Looks like app settings rather than telemetry.

**Ground-up redesign**

- Rebuild as a telemetry stream.
- Top area: dashboard grid for DB size, unsynced entries, pending photos, last sync, total entries, and error count.
- Sync logs: terminal-like stream with mono timestamps, status badges, and expandable error details.
- Photo logs: separate backup stream with file size and duration emphasis.
- Add filtering for errors-only while preserving all existing log data.

### 3.14 Tags, plant hierarchy, and inline taxonomy creation

**Current utility**

- Tags table stores note types, sources, object types, object groups, and objects.
- Object hierarchy is represented with `|` separators for group/object tag names.
- Tags are seeded, derived from entries, manually added inline, and upserted from Notion schema.
- Unknown note type colors are generated deterministically.

**Current visual state**

- Inline add-new controls appear inside forms/review cards.
- Interaction is useful but visually dense.

**Ground-up redesign**

- Keep inline creation everywhere it currently exists.
- Use a consistent `Create new` pattern across source, note type, object type, group, and object.
- Add a compact confirmation state that shows exactly what will be created in hierarchy form.
- Long-term: Settings can add a Taxonomy manager, but this must be additive and must not replace inline creation.

### 3.15 Sync and offline behavior

**Current utility**

- Local DB is the source of truth while user works.
- Sync status is tracked as synced, syncing, offline, or error.
- New entries trigger sync.
- Photos trigger backup when online.
- Hourly auto-sync runs when online.
- Browser online/offline events update status.
- Sync pulls Notion schema, pulls Notion entries, handles remote deletion, inserts new remote entries, updates local entries from Notion, derives tags, pushes local creates/updates, and backs up photos.
- Dedupe by Notion page ID and by content.
- Logs every sync attempt.

**Current visual state**

- Header chip uses icon and short text.
- Offline/error states can be easy to miss because they live in the compact header.

**Ground-up redesign**

- Keep the header sync control, but add a clear offline/error banner below the app bar when attention is needed.
- Introduce a sync detail popover: last sync, pending entries, pending photos, last error, manual sync action.
- Add pull-to-sync on mobile as an additive gesture.
- Make pending local work visible but not alarming.
- In forms, show `Saved locally` first, then `Queued for Notion` / `Synced` as progressive states.

### 3.16 CSV import/export

**Current utility**

- Export all entries to CSV with Note, Date, Note Type, Object, Object Group, Object Type, Source.
- Import CSV with matching headers.
- Normalizes dates and defaults missing note type to Activity.
- Import is transactional.

**Current visual state**

- Settings actions in cards.
- Import feedback is toast-based after selection.

**Ground-up redesign**

- Export card shows exact row count and fields included.
- Import flow previews parsed rows, detected invalid rows, and duplicates before commit.
- Preserve the current fast import path, but provide a safer review option.

### 3.17 Notion API integration

**Current utility**

- `/api/notion-test`: validates connection/database.
- `/api/notion-schema`: reads select/multi-select options.
- `/api/notion-pull`: paginated full pull.
- `/api/notion-sync`: creates Notion pages.
- `/api/notion-update`: patches existing Notion pages.
- `/api/notion-photo-sync`: backs up HD photos.
- Uses server-side environment variables, keeping API keys out of client code.

**Current visual state**

- Users see this mainly through Settings, sync chip, and Logs.

**Ground-up redesign**

- Do not change the API contract unless necessary.
- Surface integration health in Settings and Logs more clearly.
- Make failure copy actionable: missing env vars, database not shared, property mismatch, network error, rate limit, file upload error.

### 3.18 PWA, loading, empty, and error states

**Current utility**

- Manifest supports standalone portrait PWA.
- Service worker exists.
- Home skeleton handles initial readiness.
- Toast event bus displays success/error/info messages.
- Empty states exist on some pages.

**Current visual state**

- Skeleton shimmer is generic.
- Empty states are mostly text.
- Toast uses small glass surface and unicode symbols.

**Ground-up redesign**

- Make loading states match the eventual layout shape for every page.
- Empty states should provide the next best action and explain why the page is empty.
- Error states should be explicit and recoverable.
- Toasts need `role="status"`, `aria-live`, accessible icons, and a consistent placement that does not fight the bottom nav.

---

## 4. Core redesign concept: Obsidian Control

The app should feel like a high-end industrial control instrument: precise, resilient, calm, and trustworthy. It should not look like a generic dark SaaS dashboard or a mobile template.

### Design principles

1. **Field speed first**: logging a real plant event must stay faster than writing it elsewhere.
2. **Operational clarity**: users should know what is open, what is resolved, what is pending sync, and what needs attention at a glance.
3. **Industrial beauty**: dark obsidian surfaces, crisp typography, restrained cyan accents, severity colors used only for meaning, subtle material depth.
4. **Progressive density**: mobile shows the minimum necessary; desktop reveals analysis, filters, side panels, and command workflows.
5. **Local-first trust**: every save should communicate that the data is safe locally even if Notion is unavailable.
6. **No hidden regressions**: every current route and workflow remains available, even when navigation is reorganized.

### Visual language

- Base: near-black obsidian, not pure black.
- Surfaces: layered graphite panels with one-pixel inner highlights and restrained borders.
- Primary accent: industrial cyan used for action, focus, active route, and sync health.
- Semantic accents: rose for complaints/danger, amber for abnormalities/warnings, emerald for resolved/success, blue/cyan for activity.
- Typography: a characterful geometric display face for headings and stats, a clear body sans for forms, and a strong mono face for timestamps, equipment codes, counts, and telemetry.
- Motion: spring-based but functional; surfaces should feel like panels sliding and locking into place, not decorative animation.

---

## 5. Information architecture redesign

### Mobile navigation

Keep bottom navigation because the app is field/mobile-first:

1. Home
2. Log / Multi entry access through a prominent central action or split action sheet
3. Profiles
4. History
5. Issues
6. Logs/System access through a More/System pattern if six tabs become crowded

Settings should be reachable from the sync/system chip and from a `More`/system menu. Existing `/settings` remains.

### Desktop navigation

At `lg+`:

- Left rail: Home, New Log, Multi, Profiles, History, Issues, Logs, Settings.
- Top command bar: global search/command palette, sync state, offline/error banner, current page title.
- Main content uses real grid layouts rather than a phone-width column.

### Command palette

Use existing Fuse.js dependency to add a global command palette:

- Search entries.
- Search assets.
- Jump to routes.
- Create new entry.
- Start multi-input.
- Trigger sync.
- Open settings/logs.

This is additive and should not replace existing controls.

---

## 6. Design system implementation target

### Tokens

Create semantic tokens before page work:

- `--color-obsidian`: app background.
- `--color-panel-1`, `--color-panel-2`, `--color-panel-3`: layered surfaces.
- `--color-border-subtle`, `--color-border-strong`.
- `--color-text`, `--color-text-muted`, `--color-label`, `--color-heading`.
- `--color-primary`: industrial cyan.
- `--color-activity`, `--color-complaint`, `--color-abnormality`, `--color-resolved`.
- `--shadow-panel`, `--shadow-glow-primary`, `--shadow-danger`, `--shadow-warning`.
- `--radius-control`, `--radius-panel`, `--radius-sheet`.
- `--z-header`, `--z-nav`, `--z-sheet`, `--z-toast`, `--z-noise`.

### Typography

- Replace the current Inter-only system with a deliberate pairing.
- Recommended direction:
  - Display/headings/stats: Space Grotesk or Satoshi.
  - Body/forms: Geist or Inter if dependency simplicity is preferred.
  - Data/timestamps/codes: JetBrains Mono.
- Minimum functional text size should be 12px; body should usually be 14px+.
- Use tabular numerals for counts, durations, timestamps, and stats.

### Components to standardize

1. AppShell / PageShell.
2. Surface / Panel.
3. Button and IconButton.
4. Input, TextArea, Select, SearchBox.
5. Badge / StatusPill.
6. SegmentedControl / ToggleGroup.
7. Sheet / Dialog / SidePanel adaptive primitive.
8. Timeline / TimelineCard.
9. EmptyState.
10. LoadingSkeleton.
11. Toast.
12. SyncStatusPopover.
13. CommandPalette.

### Accessibility baseline

- Add global `:focus-visible` with a highly visible outline.
- All icon-only buttons require `aria-label`.
- Navigation requires `aria-current="page"`.
- Sheets/dialogs require focus trap, Escape close, initial focus, and focus return.
- Toasts require `role="status"` and `aria-live="polite"`.
- Color cannot be the only status indicator; combine text, icon, and/or shape.
- Touch targets should be at least 44px.
- Reduce reliance on `text-neutral-500` micro-text on near-black surfaces.

---

## 7. Page-by-page implementation plan

### Phase 0: Baseline and safety

Files: `package.json`, `src/index.css`, build tooling, no product behavior changes.

1. Restore local dev/build health, including the current `@fontsource/inter/400.css` resolution issue.
2. Run current build/lint where possible.
3. Document screenshots of current core routes before redesign.
4. Add a manual regression checklist covering every route and workflow listed in this document.

Acceptance criteria:

- App runs locally without Vite overlay.
- No feature code is removed.
- Baseline current-state screenshots exist for comparison.

### Phase 1: Design tokens, primitives, and accessibility

Files: `src/index.css`, `src/components/ui/*`, shared types/utilities as needed.

1. Replace mixed raw neutral/teal/blue usage with semantic tokens.
2. Establish the new typography stack.
3. Refactor Button, Input, Select, TextArea, Badge, SegmentedControl, Sheet, Skeleton, Toaster, and SyncIndicator to the new system.
4. Add accessible focus states, icon labels, toast live regions, sheet keyboard behavior, and nav `aria-current`.
5. Keep component APIs backward compatible where possible to reduce page churn.

Acceptance criteria:

- Existing pages still render with all controls available.
- Keyboard navigation visibly works.
- No action becomes mouse-only or touch-only.

### Phase 2: App shell and responsive architecture

Files: `src/components/layout/AppShell.tsx`, page wrappers.

1. Implement adaptive shell:
   - Mobile: sticky top status/header and bottom navigation.
   - Desktop: left navigation rail and top command bar.
2. Add route titles and consistent page padding/max-width rules.
3. Add offline/error banner behavior tied to existing sync status.
4. Add page transition wrapper with restrained motion.
5. Ensure Settings is discoverable.

Acceptance criteria:

- All existing routes are reachable on mobile and desktop.
- Mobile bottom nav remains safe-area aware.
- Desktop no longer appears as a stretched mobile phone.

### Phase 3: Entry capture flows

Files: `src/pages/NewEntry.tsx`, `src/components/entry/EntryForm.tsx`, `src/components/entry/EntryDetailSheet.tsx`, `src/utils/auto-tag.ts` only if UI needs helper metadata.

1. Reorder EntryForm around note-first capture.
2. Redesign note type selection as larger, color-coded operational choices.
3. Convert object hierarchy selection into a breadcrumb builder with progressive manual controls.
4. Upgrade auto-tag suggestions into clear detected/applied/override chips.
5. Add mode banners for create/edit/duplicate.
6. Redesign EntryDetailSheet as adaptive drawer/dialog with accessible actions.

Acceptance criteria:

- Create, edit, duplicate, delete all work.
- Existing tag creation and hierarchy creation remain available.
- Auto-tagging remains real-time and overridable.

### Phase 4: Home and timeline system

Files: `src/pages/Home.tsx`, `src/components/timeline/*`, `src/components/entry/EntryRow.tsx` if retained.

1. Build the new timeline primitive with robust connector/dot implementation.
2. Redesign Home as shift dashboard with status capsules, primary log action, photo action, today timeline, and recent groups.
3. Improve empty states and loading state.
4. Add quick action affordances to timeline cards while preserving detail-sheet open on tap.

Acceptance criteria:

- Today's entries, previous groups, photo strip, object navigation, and detail sheet all remain.
- Timeline sub-entry parsing still renders bullet sublists.

### Phase 5: Multi-input batch processor

Files: `src/pages/MultiInput.tsx`, shared entry controls.

1. Redesign input step as paste/drop zone with clear parsing rules.
2. Redesign review step with sticky batch summary.
3. Virtualize large review lists using `@tanstack/react-virtual`.
4. Keep per-entry editing, entry removal, inline tag creation, source/date changes, and submit all.
5. Make entries needing manual review visually distinct.

Acceptance criteria:

- Bullets, numbered lines, and plain newlines parse correctly.
- Bulk auto-tagging remains intact.
- Users can still edit every field before submit.

### Phase 6: History and command search

Files: `src/pages/History.tsx`, new command palette component, search utilities.

1. Upgrade History filters and search UI.
2. Add desktop filter panel and mobile sticky filter rail.
3. Use Fuse.js for global command palette and optionally enhanced History search.
4. Virtualize long timelines.
5. Preserve grouped-by-date mental model.

Acceptance criteria:

- Existing search/filter behavior still works.
- Detail sheet and object navigation remain.
- Command palette is additive; no existing button disappears.

### Phase 7: Issues and asset lifecycle

Files: `src/pages/Issues.tsx`, `src/pages/Equipment.tsx`, shared timeline/status components.

1. Redesign Issues as alert console with strong open/resolved summary.
2. Preserve object-based resolution detection.
3. Add `Log resolution` shortcut as additive workflow.
4. Redesign Equipment as asset file with metadata hero, related photos, filters, and sticky new-log action.
5. Ensure `?object=` deep links continue to work.

Acceptance criteria:

- Open/resolved counts match current logic.
- Abnormality and complaint distinction remains clear.
- Asset-specific timeline remains accurate.

### Phase 8: Profiles asset command center

Files: `src/pages/Profiles.tsx`, shared asset/status components.

1. Preserve current topology construction and severity logic.
2. Redesign type panels, group matrices, asset buttons, and asset detail sidebar.
3. Add explainable severity details.
4. Add related asset actions: view asset file, new log for this asset, related photos.
5. Improve responsive behavior to mobile, desktop, and ultrawide.

Acceptance criteria:

- Type -> group -> object navigation remains.
- Selection state is clear.
- Critical/warning/normal severity remains accurate and not color-only.

### Phase 9: Photo capture and media review

Files: `src/components/photo/PhotoCaptureSheet.tsx`, `src/pages/Home.tsx`, optionally Equipment/Profile photo surfaces.

1. Rebuild PhotoCaptureSheet on top of the shared adaptive Sheet/Dialog primitive.
2. Preserve camera capture, multi-file picker, SD/HD compression, required tag, quick tags, offline save, Notion backup queue, and delete.
3. Improve compression and sync-state visualization.
4. Add asset-aware photo suggestions when launched from asset contexts.
5. Upgrade Home photo filmstrip and add related photos to Equipment.

Acceptance criteria:

- Photo size targets and HD backup behavior remain.
- Offline photo save works.
- Notion photo backup still logs success/failure.

### Phase 10: Settings, logs, sync visibility, import/export

Files: `src/pages/Settings.tsx`, `src/pages/Logs.tsx`, `src/components/ui/SyncIndicator.tsx`, sync-related UI.

1. Redesign Settings into System Preferences panels.
2. Add CSV import preview as an additive safety step.
3. Redesign Logs as telemetry dashboard/stream.
4. Add SyncStatusPopover with pending entries/photos and last error.
5. Improve error messages from Notion integration paths.

Acceptance criteria:

- Test connection, manual sync, export, import, clear data, clear logs all remain.
- Logs still show every metric currently recorded.
- Sync status remains clickable/manual.

### Phase 11: Final polish, QA, and release readiness

1. Run build, lint, and route-level manual testing.
2. Test offline mode, online recovery, and Notion failure modes.
3. Test mobile viewport, tablet, desktop, and ultrawide.
4. Test keyboard navigation and screen-reader labels.
5. Validate CSV round trip.
6. Validate photo capture and backup with small and large files.
7. Validate existing demo seed data still appears correctly.

Acceptance criteria:

- No feature from Section 2 is missing.
- No route is unreachable.
- No critical a11y blocker remains.
- Visual QA confirms the app reads as one coherent product.

---

## 8. Suggested implementation order by pull request

1. **PR 1: Baseline health and design-token foundation**  
   Fix dev/build baseline, define tokens, typography, focus states, and primitive component styles.

2. **PR 2: Adaptive app shell**  
   Mobile/desktop navigation, command bar, offline/error banner, route titles.

3. **PR 3: Entry and detail workflows**  
   EntryForm, auto-tag suggestion UI, EntryDetailSheet, delete/edit/duplicate polish.

4. **PR 4: Timeline and Home dashboard**  
   Timeline primitive, Home shift dashboard, photo filmstrip, empty/loading states.

5. **PR 5: Multi-input batch redesign**  
   Paste zone, virtualized review list, batch summary, progressive editing.

6. **PR 6: History and command palette**  
   Search/filter redesign, Fuse-powered global command palette, virtualization.

7. **PR 7: Issues and Equipment**  
   Alert console, asset file, resolution shortcut, asset-related photos/actions.

8. **PR 8: Profiles command center**  
   Asset topology redesign, severity explanation, responsive multi-column layout.

9. **PR 9: Photos, Settings, Logs, sync visibility**  
   Adaptive photo sheet, System Preferences, telemetry stream, sync popover, CSV import preview.

10. **PR 10: Final polish and regression pass**  
    Motion tuning, responsive polish, accessibility fixes, full manual QA, screenshots.

---

## 9. Regression checklist

Before considering the redesign complete, verify:

- [ ] App loads as PWA and routes work under HashRouter.
- [ ] Home shows quick actions, photos, today entries, previous groups, and empty state.
- [ ] New entry save works offline and online.
- [ ] Edit, duplicate, and delete work from detail sheet.
- [ ] Auto-tagging detects note type and equipment and can be overridden.
- [ ] Inline tag/source/object creation works in single and multi-entry flows.
- [ ] Multi-input parses bullets, numbered entries, and newlines.
- [ ] Multi-input review can edit/remove/submit all entries.
- [ ] History search and filters work.
- [ ] Issues open/resolved logic matches current behavior.
- [ ] Equipment deep link by object works.
- [ ] Profiles topology, selected asset, and severity states work.
- [ ] Photo capture, multi-file select, compression, tagging, delete, and sync queue work.
- [ ] Notion connection test works.
- [ ] Pull/push/update/delete reconciliation still works.
- [ ] Photo backup to Notion works and logs results.
- [ ] CSV export/import round trip works.
- [ ] Clear data and clear logs require confirmation and work.
- [ ] Logs show DB stats, sync history, and photo sync history.
- [ ] Offline banner/status is accurate.
- [ ] Keyboard focus is visible everywhere.
- [ ] Screen-reader labels exist for icon-only controls.
- [ ] Mobile safe-area spacing works.
- [ ] Desktop layout uses full space without breaking mobile utility.

---

## 10. Final product target

The redesigned DM Companion should feel like the best possible field instrument for a DM plant operator: fast under pressure, visually memorable, calm in emergencies, trustworthy offline, clear about sync state, and beautiful enough to feel designed rather than assembled. It should preserve the entire current product while making the core workflows faster, more discoverable, more accessible, and more resilient.
