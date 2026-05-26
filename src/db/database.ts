import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import type { LogEntry, NoteType, ObjectOption, Tag } from '@/types'
import { DEFAULT_NOTE_TYPES, getNoteTypeColor } from '@/types'

let db: Database | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let idbDb: IDBDatabase | null = null

const DB_KEY = 'dm-companion-db'

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  })

  const savedDb = await loadFromIndexedDB()

  if (savedDb) {
    db = new SQL.Database(savedDb)
  } else {
    db = new SQL.Database()
  }

  createTables(db)

  return db
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note TEXT NOT NULL,
      date TEXT NOT NULL,
      note_type TEXT NOT NULL,
      object TEXT DEFAULT '',
      object_group TEXT DEFAULT '',
      object_type TEXT DEFAULT '',
      source TEXT DEFAULT '',
      notion_page_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      synced INTEGER NOT NULL DEFAULT 0
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(name, category)
    )
  `)

  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_date ON log_entries(date DESC)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_note_type ON log_entries(note_type)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_object ON log_entries(object)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_synced ON log_entries(synced)`)

  const existing = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
  if (existing.length === 0 || existing[0].values.length === 0) {
    database.run("INSERT INTO schema_version (version) VALUES (1)")
  }

  scheduleSave()
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('dm-companion', 1)
    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database')
      }
    }
    request.onsuccess = () => {
      const idb = request.result
      const tx = idb.transaction('database', 'readonly')
      const store = tx.objectStore('database')
      const getReq = store.get(DB_KEY)
      getReq.onsuccess = () => resolve(getReq.result || null)
      getReq.onerror = () => resolve(null)
    }
    request.onerror = () => resolve(null)
  })
}

export function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => saveDatabase(), 300)
}

async function openIDB(): Promise<IDBDatabase> {
  if (idbDb) return idbDb
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('dm-companion', 1)
    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database')
      }
    }
    request.onsuccess = () => {
      idbDb = request.result
      resolve(idbDb!)
    }
    request.onerror = () => reject(request.error)
  })
}

async function saveDatabase(): Promise<void> {
  if (!db) return
  const data = db.export()
  const buffer = new Uint8Array(data)
  const idb = await openIDB()
  return new Promise<void>((resolve, reject) => {
    const tx = idb.transaction('database', 'readwrite')
    const store = tx.objectStore('database')
    const putReq = store.put(buffer, DB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    putReq.onerror = () => reject(putReq.error)
  })
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
      }
      saveDatabase()
    }
  })
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function insertEntry(entry: {
  note: string
  date: string
  noteType: NoteType
  object?: string
  objectGroup?: string
  objectType?: string
  source?: string
}): number {
  const d = getDatabase()
  d.run(
    'INSERT INTO log_entries (note, date, note_type, object, object_group, object_type, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [entry.note, entry.date, entry.noteType, entry.object || '', entry.objectGroup || '', entry.objectType || '', entry.source || '']
  )
  const result = d.exec('SELECT last_insert_rowid() as id')
  const id = result[0].values[0][0] as number
  scheduleSave()
  return id
}

export function updateEntry(id: number, entry: Partial<{
  note: string
  date: string
  noteType: NoteType
  object: string
  objectGroup: string
  objectType: string
  source: string
}>): void {
  const d = getDatabase()
  const fields: string[] = []
  const values: SqlValue[] = []

  if (entry.note !== undefined) { fields.push('note = ?'); values.push(entry.note) }
  if (entry.date !== undefined) { fields.push('date = ?'); values.push(entry.date) }
  if (entry.noteType !== undefined) { fields.push('note_type = ?'); values.push(entry.noteType) }
  if (entry.object !== undefined) { fields.push('object = ?'); values.push(entry.object) }
  if (entry.objectGroup !== undefined) { fields.push('object_group = ?'); values.push(entry.objectGroup) }
  if (entry.objectType !== undefined) { fields.push('object_type = ?'); values.push(entry.objectType) }
  if (entry.source !== undefined) { fields.push('source = ?'); values.push(entry.source) }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  d.run(`UPDATE log_entries SET ${fields.join(', ')} WHERE id = ?`, values)
  scheduleSave()
}

export function deleteEntry(id: number): void {
  const d = getDatabase()
  d.run('DELETE FROM log_entries WHERE id = ?', [id])
  scheduleSave()
}

function rowToEntry(row: unknown[]): LogEntry {
  return {
    id: row[0] as number,
    note: row[1] as string,
    date: row[2] as string,
    noteType: row[3] as NoteType,
    object: row[4] as string,
    objectGroup: row[5] as string,
    objectType: row[6] as string,
    source: row[7] as string,
    notionPageId: row[8] as string | null,
    createdAt: row[9] as string,
    updatedAt: row[10] as string,
    synced: row[11] as number,
  }
}

export function getEntry(id: number): LogEntry | null {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM log_entries WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return null
  return rowToEntry(result[0].values[0])
}

export function getEntries(options?: {
  noteType?: NoteType
  objectType?: string
  objectGroup?: string
  search?: string
  limit?: number
  offset?: number
}): LogEntry[] {
  const d = getDatabase()
  let sql = 'SELECT * FROM log_entries WHERE 1=1'
  const params: SqlValue[] = []

  if (options?.noteType) {
    sql += ' AND note_type = ?'
    params.push(options.noteType)
  }
  if (options?.objectType) {
    sql += ' AND object_type = ?'
    params.push(options.objectType)
  }
  if (options?.objectGroup) {
    sql += ' AND object_group = ?'
    params.push(options.objectGroup)
  }
  if (options?.search) {
    sql += ' AND (note LIKE ? OR object LIKE ? OR object_group LIKE ?)'
    const term = `%${options.search}%`
    params.push(term, term, term)
  }

  sql += ' ORDER BY date DESC, id DESC'

  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options?.offset) {
    sql += ' OFFSET ?'
    params.push(options.offset)
  }

  const result = d.exec(sql, params)
  if (result.length === 0) return []
  return result[0].values.map(rowToEntry)
}

export function getEntriesByDate(): Map<string, LogEntry[]> {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM log_entries ORDER BY date DESC, id DESC')
  const map = new Map<string, LogEntry[]>()

  if (result.length === 0) return map

  for (const row of result[0].values) {
    const entry = rowToEntry(row)
    const dateKey = entry.date
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(entry)
  }

  return map
}

export function getEntryCountsByType(): Record<string, number> {
  const d = getDatabase()
  const result = d.exec('SELECT note_type, COUNT(*) as count FROM log_entries GROUP BY note_type')
  const counts: Record<string, number> = { all: 0 }

  // Initialize counts for all known note types from tags table
  const noteTypes = getNoteTypes()
  for (const nt of noteTypes) counts[nt] = 0

  let total = 0
  if (result.length > 0) {
    for (const row of result[0].values) {
      counts[row[0] as string] = row[1] as number
      total += row[1] as number
    }
  }
  counts.all = total
  return counts
}

export function getObjectHierarchy(): { types: string[]; groups: Record<string, string[]>; objects: Record<string, ObjectOption[]> } {
  const d = getDatabase()

  // Get types from existing entries
  const typesResult = d.exec("SELECT DISTINCT object_type FROM log_entries WHERE object_type != '' ORDER BY object_type")
  const entryTypes = typesResult.length > 0 ? typesResult[0].values.map((r: unknown[]) => r[0] as string) : []

  // Get types from tags table (object_type category)
  const tagTypesResult = d.exec("SELECT name FROM tags WHERE category = 'object_type' ORDER BY sort_order, name")
  const tagTypes = tagTypesResult.length > 0 ? tagTypesResult[0].values.map((r: unknown[]) => r[0] as string) : []

  // Merge and deduplicate
  const typesSet = new Set([...entryTypes, ...tagTypes])
  const types = [...typesSet].sort()

  const groups: Record<string, string[]> = {}
  const objects: Record<string, ObjectOption[]> = []

  for (const type of types) {
    // Get groups from existing entries
    const groupResult = d.exec(
      "SELECT DISTINCT object_group FROM log_entries WHERE object_type = ? AND object_group != '' ORDER BY object_group",
      [type]
    )
    const entryGroups = groupResult.length > 0 ? groupResult[0].values.map((r: unknown[]) => r[0] as string) : []

    // Get groups from tags table (object_group category) — stored as "type|group" in name
    const tagGroupsResult = d.exec(
      "SELECT name FROM tags WHERE category = 'object_group' AND name LIKE ? ORDER BY sort_order, name",
      [type + '|%']
    )
    const tagGroups = tagGroupsResult.length > 0
      ? tagGroupsResult[0].values.map((r: unknown[]) => (r[0] as string).split('|').pop()! as string)
      : []

    // Merge and deduplicate groups
    const groupsSet = new Set([...entryGroups, ...tagGroups])
    groups[type] = [...groupsSet].sort()

    for (const group of groups[type]) {
      const objResult = d.exec(
        "SELECT DISTINCT object, object_group, object_type FROM log_entries WHERE object_group = ? AND object != '' ORDER BY object",
        [group]
      )
      objects[group] = objResult.length > 0
        ? objResult[0].values.map((r: unknown[]) => ({ object: r[0] as string, objectGroup: r[1] as string, objectType: r[2] as string }))
        : []
    }
  }

  return { types, groups, objects }
}

export function getUnsyncedEntries(): LogEntry[] {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM log_entries WHERE synced = 0 ORDER BY id ASC')
  if (result.length === 0) return []
  return result[0].values.map(rowToEntry)
}

export function markAsSynced(ids: number[]): void {
  const d = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  d.run(`UPDATE log_entries SET synced = 1 WHERE id IN (${placeholders})`, ids)
  scheduleSave()
}

export function searchEntries(query: string, limit = 50): LogEntry[] {
  const d = getDatabase()
  const searchTerm = `%${query}%`
  const result = d.exec(
    'SELECT * FROM log_entries WHERE note LIKE ? OR object LIKE ? OR object_group LIKE ? OR object_type LIKE ? ORDER BY date DESC, id DESC LIMIT ?',
    [searchTerm, searchTerm, searchTerm, searchTerm, limit]
  )
  if (result.length === 0) return []
  return result[0].values.map(rowToEntry)
}

export function importFromCSV(rows: { note: string; date: string; noteType: string; object: string; objectGroup: string; objectType: string; source: string }[]): number {
  const d = getDatabase()
  let imported = 0
  d.run('BEGIN TRANSACTION')
  try {
    for (const row of rows) {
      d.run(
        'INSERT INTO log_entries (note, date, note_type, object, object_group, object_type, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [row.note, row.date, row.noteType, row.object, row.objectGroup, row.objectType, row.source]
      )
      imported++
    }
    d.run('COMMIT')
  } catch {
    d.run('ROLLBACK')
    imported = 0
  }
  if (imported > 0) scheduleSave()
  return imported
}

export function getExistingNotionPageIds(): Set<string> {
  const d = getDatabase()
  const result = d.exec("SELECT notion_page_id FROM log_entries WHERE notion_page_id IS NOT NULL AND notion_page_id != ''")
  if (result.length === 0) return new Set()
  return new Set(result[0].values.map((r: unknown[]) => r[0] as string))
}

/**
 * Check if an entry with the same content already exists locally.
 * Used to prevent duplicates when pulling from Notion.
 * Matches on: note, date, noteType, object, objectGroup, objectType
 */
export function isDuplicateEntry(entry: {
  note: string
  date: string
  noteType: string
  object: string
  objectGroup: string
  objectType: string
}): boolean {
  const d = getDatabase()
  const result = d.exec(
    "SELECT id FROM log_entries WHERE note = ? AND date = ? AND note_type = ? AND object = ? AND object_group = ? AND object_type = ? LIMIT 1",
    [entry.note, entry.date, entry.noteType, entry.object || '', entry.objectGroup || '', entry.objectType || '']
  )
  return result.length > 0 && result[0].values.length > 0
}

/**
 * Delete local entries whose notionPageId is NOT in the provided set of remote IDs.
 * This handles Notion-side deletions: if an entry was deleted from Notion,
 * we remove the corresponding local entry.
 * Returns the number of entries deleted.
 */
export function deleteNotionRemovedEntries(remotePageIds: Set<string>): number {
  const d = getDatabase()
  // Find all local entries that have a notionPageId but it's not in the remote set
  const result = d.exec("SELECT id, notion_page_id FROM log_entries WHERE notion_page_id IS NOT NULL AND notion_page_id != ''")
  if (result.length === 0) return 0

  let deleted = 0
  for (const row of result[0].values) {
    const id = row[0] as number
    const pageId = row[1] as string
    if (!remotePageIds.has(pageId)) {
      d.run('DELETE FROM log_entries WHERE id = ?', [id])
      deleted++
    }
  }

  if (deleted > 0) scheduleSave()
  return deleted
}

export function insertEntryFromNotion(entry: {
  note: string
  date: string
  noteType: NoteType
  object?: string
  objectGroup?: string
  objectType?: string
  source?: string
  notionPageId: string
}): number {
  const d = getDatabase()
  d.run(
    'INSERT INTO log_entries (note, date, note_type, object, object_group, object_type, source, notion_page_id, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [entry.note, entry.date, entry.noteType, entry.object || '', entry.objectGroup || '', entry.objectType || '', entry.source || '', entry.notionPageId]
  )
  const result = d.exec('SELECT last_insert_rowid() as id')
  const id = result[0].values[0][0] as number
  scheduleSave()
  return id
}

export function clearAllData(): void {
  const d = getDatabase()
  d.run('DELETE FROM log_entries')
  scheduleSave()
}

export function exportAllEntries(): LogEntry[] {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM log_entries ORDER BY date DESC, id DESC')
  if (result.length === 0) return []
  return result[0].values.map(rowToEntry)
}

export interface OpenIssue {
  entry: LogEntry
  resolved: boolean
}

// ─── Tag CRUD ────────────────────────────────────────────────────────────

function rowToTag(row: unknown[]): Tag {
  return {
    id: row[0] as number,
    name: row[1] as string,
    category: row[2] as 'note_type' | 'source',
    color: row[3] as string,
    sortOrder: row[4] as number,
  }
}

export function getTags(category?: 'note_type' | 'source'): Tag[] {
  const d = getDatabase()
  const sql = category
    ? 'SELECT * FROM tags WHERE category = ? ORDER BY sort_order, name'
    : 'SELECT * FROM tags ORDER BY category, sort_order, name'
  const params = category ? [category] : []
  const result = d.exec(sql, params)
  if (result.length === 0) return []
  return result[0].values.map(rowToTag)
}

export function getNoteTypes(): string[] {
  return getTags('note_type').map(t => t.name)
}

export function getSourceTags(): string[] {
  return getTags('source').map(t => t.name)
}

export function addTag(tag: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group'; color?: string; sortOrder?: number }): number {
  const d = getDatabase()
  const color = tag.color || getNoteTypeColor(tag.name)
  d.run(
    'INSERT OR IGNORE INTO tags (name, category, color, sort_order) VALUES (?, ?, ?, ?)',
    [tag.name, tag.category, color, tag.sortOrder ?? 0]
  )
  const result = d.exec('SELECT last_insert_rowid() as id')
  const id = result[0].values[0][0] as number
  scheduleSave()
  return id
}

export function deleteTag(id: number): void {
  const d = getDatabase()
  d.run('DELETE FROM tags WHERE id = ?', [id])
  scheduleSave()
}

export function upsertTagsFromNotion(tags: { name: string; category: 'note_type' | 'source'; color?: string }[]): number {
  const d = getDatabase()
  let upserted = 0
  d.run('BEGIN TRANSACTION')
  try {
    for (const tag of tags) {
      const color = tag.color || getNoteTypeColor(tag.name)
      // Check if tag exists
      const existing = d.exec(
        'SELECT id FROM tags WHERE name = ? AND category = ?',
        [tag.name, tag.category]
      )
      if (existing.length === 0 || existing[0].values.length === 0) {
        d.run(
          'INSERT INTO tags (name, category, color, sort_order, synced) VALUES (?, ?, ?, 0, 1)',
          [tag.name, tag.category, color]
        )
        upserted++
      } else {
        // Update color if changed
        d.run(
          'UPDATE tags SET color = ?, synced = 1 WHERE name = ? AND category = ?',
          [color, tag.name, tag.category]
        )
      }
    }
    d.run('COMMIT')
  } catch {
    d.run('ROLLBACK')
  }
  if (upserted > 0) scheduleSave()
  return upserted
}

export function seedDefaultTags(): void {
  const d = getDatabase()
  const existing = d.exec("SELECT COUNT(*) FROM tags WHERE category = 'note_type'")
  const count = existing.length > 0 ? (existing[0].values[0][0] as number) : 0
  if (count > 0) return // Already seeded

  const defaultColors: Record<string, string> = {
    'Activity': '#3B82F6',
    'Complaints': '#EF4444',
    'Abnormality': '#F97316',
    'Resolved Complaint': '#22C55E',
  }

  DEFAULT_NOTE_TYPES.forEach((name, i) => {
    d.run(
      'INSERT OR IGNORE INTO tags (name, category, color, sort_order) VALUES (?, ?, ?, ?)',
      [name, 'note_type', defaultColors[name] || getNoteTypeColor(name), i]
    )
  })

  // Default source tags
  const defaultSources = ['CWTP logbook', 'DM Reports WA group']
  defaultSources.forEach((name, i) => {
    d.run(
      'INSERT OR IGNORE INTO tags (name, category, color, sort_order) VALUES (?, ?, ?, ?)',
      [name, 'source', '#8B5CF6', i]
    )
  })

  scheduleSave()
}

export function getOpenIssues(): OpenIssue[] {
  const d = getDatabase()

  // Get all Complaints and Abnormalities
  const issues = d.exec(
    "SELECT * FROM log_entries WHERE note_type IN ('Complaints', 'Abnormality') ORDER BY date DESC, id DESC"
  )
  if (issues.length === 0) return []

  const issueEntries = issues[0].values.map(rowToEntry)

  // Get all Resolved Complaints
  const resolved = d.exec(
    "SELECT object FROM log_entries WHERE note_type = 'Resolved Complaint' AND object != ''"
  )
  const resolvedObjects = new Set<string>()
  if (resolved.length > 0) {
    for (const row of resolved[0].values) {
      resolvedObjects.add((row[0] as string).toLowerCase().trim())
    }
  }

  return issueEntries.map(entry => ({
    entry,
    resolved: entry.object ? resolvedObjects.has(entry.object.toLowerCase().trim()) : false,
  }))
}