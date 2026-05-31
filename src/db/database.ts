import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import type { LogEntry, NoteType, ObjectOption, PhotoFilterOptions, PhotoSyncLog, PlantPhoto, Tag } from '@/types'
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

  database.run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      pulled INTEGER DEFAULT 0,
      pushed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      duplicates_skipped INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      tags_upserted INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      updated INTEGER DEFAULT 0
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS plant_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      sd_data BLOB NOT NULL,
      sd_mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      hd_data BLOB,
      hd_mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      sd_size_bytes INTEGER NOT NULL DEFAULT 0,
      hd_size_bytes INTEGER NOT NULL DEFAULT 0,
      notion_page_id TEXT,
      notion_file_upload_id TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS photo_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      status TEXT NOT NULL,
      pushed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      total_size_kb INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error TEXT DEFAULT ''
    )
  `)

  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_date ON log_entries(date DESC)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_note_type ON log_entries(note_type)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_object ON log_entries(object)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_entries_synced ON log_entries(synced)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_photos_created ON plant_photos(created_at DESC)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_photos_tag ON plant_photos(tag)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_photos_synced ON plant_photos(synced)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_photo_sync_logs_timestamp ON photo_sync_logs(timestamp DESC)`)

  const existing = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
  if (existing.length === 0 || existing[0].values.length === 0) {
    database.run("INSERT INTO schema_version (version) VALUES (1)")
  }

  // Migration: add updated column to sync_logs if missing
  try {
    const cols = database.exec("PRAGMA table_info(sync_logs)")
    if (cols.length > 0) {
      const hasUpdated = cols[0].values.some((c: unknown[]) => c[1] === 'updated')
      if (!hasUpdated) {
        database.exec("ALTER TABLE sync_logs ADD COLUMN updated INTEGER DEFAULT 0")
      }
    }
  } catch { /* column already exists */ }

  migratePlantPhotos(database)

  scheduleSave()
}

function migratePlantPhotos(database: Database) {
  const cols = database.exec('PRAGMA table_info(plant_photos)')
  if (cols.length === 0) return
  const columnNames = new Set(cols[0].values.map((c: unknown[]) => c[1] as string))
  const migrations: string[] = []

  if (!columnNames.has('sd_mime_type')) migrations.push("ALTER TABLE plant_photos ADD COLUMN sd_mime_type TEXT NOT NULL DEFAULT 'image/jpeg'")
  if (!columnNames.has('hd_mime_type')) migrations.push("ALTER TABLE plant_photos ADD COLUMN hd_mime_type TEXT NOT NULL DEFAULT 'image/jpeg'")
  if (!columnNames.has('sd_size_bytes')) migrations.push('ALTER TABLE plant_photos ADD COLUMN sd_size_bytes INTEGER NOT NULL DEFAULT 0')
  if (!columnNames.has('hd_size_bytes')) migrations.push('ALTER TABLE plant_photos ADD COLUMN hd_size_bytes INTEGER NOT NULL DEFAULT 0')
  if (!columnNames.has('notion_page_id')) migrations.push('ALTER TABLE plant_photos ADD COLUMN notion_page_id TEXT')
  if (!columnNames.has('notion_file_upload_id')) migrations.push('ALTER TABLE plant_photos ADD COLUMN notion_file_upload_id TEXT')
  if (!columnNames.has('synced')) migrations.push('ALTER TABLE plant_photos ADD COLUMN synced INTEGER NOT NULL DEFAULT 0')
  if (!columnNames.has('note')) migrations.push("ALTER TABLE plant_photos ADD COLUMN note TEXT NOT NULL DEFAULT ''")

  for (const migration of migrations) database.run(migration)
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
  noteType: NoteType
  object: string
  objectGroup: string
  objectType: string
  source: string
}>): void {
  const d = getDatabase()
  const fields: string[] = []
  const values: SqlValue[] = []

  if (entry.noteType !== undefined) { fields.push('note_type = ?'); values.push(entry.noteType) }
  if (entry.object !== undefined) { fields.push('object = ?'); values.push(entry.object) }
  if (entry.objectGroup !== undefined) { fields.push('object_group = ?'); values.push(entry.objectGroup) }
  if (entry.objectType !== undefined) { fields.push('object_type = ?'); values.push(entry.objectType) }
  if (entry.source !== undefined) { fields.push('source = ?'); values.push(entry.source) }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now', 'localtime')")
  fields.push('synced = 0')
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
  const objects: Record<string, ObjectOption[]> = {}

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
      const entryObjects = objResult.length > 0
        ? objResult[0].values.map((r: unknown[]) => ({ object: r[0] as string, objectGroup: r[1] as string, objectType: r[2] as string }))
        : []

      // Get objects from tags table (object category) — stored as "type|group|objectName"
      const tagObjectsResult = d.exec(
        "SELECT name FROM tags WHERE category = 'object' AND name LIKE ? ORDER BY sort_order, name",
        [type + '|' + group + '|%']
      )
      const tagObjects = tagObjectsResult.length > 0
        ? tagObjectsResult[0].values.map((r: unknown[]) => {
            const parts = (r[0] as string).split('|')
            return { object: parts[2] || parts[1] || '', objectGroup: group, objectType: type }
          })
        : []

      // Merge and deduplicate objects
      const seen = new Set<string>()
      const merged: ObjectOption[] = []
      for (const obj of [...entryObjects, ...tagObjects]) {
        if (!seen.has(obj.object)) {
          seen.add(obj.object)
          merged.push(obj)
        }
      }
      objects[group] = merged.sort((a, b) => a.object.localeCompare(b.object))
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

function rowToPhoto(row: unknown[]): PlantPhoto {
  return {
    id: row[0] as number,
    tag: row[1] as string,
    note: row[2] as string,
    sdData: row[3] as Uint8Array,
    sdMimeType: row[4] as string,
    hdData: row[5] as Uint8Array | null,
    hdMimeType: row[6] as string,
    sdSizeBytes: row[7] as number,
    hdSizeBytes: row[8] as number,
    notionPageId: row[9] as string | null,
    notionFileUploadId: row[10] as string | null,
    synced: row[11] as number,
    createdAt: row[12] as string,
  }
}

const PHOTO_COLUMNS = 'id, tag, note, sd_data, sd_mime_type, hd_data, hd_mime_type, sd_size_bytes, hd_size_bytes, notion_page_id, notion_file_upload_id, synced, created_at'

export function insertPlantPhoto(photo: {
  tag: string
  note?: string
  sdData: Uint8Array
  sdMimeType: string
  hdData: Uint8Array
  hdMimeType: string
}): number {
  const d = getDatabase()
  d.run(
    `INSERT INTO plant_photos
      (tag, note, sd_data, sd_mime_type, hd_data, hd_mime_type, sd_size_bytes, hd_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [photo.tag.trim(), photo.note?.trim() || '', photo.sdData, photo.sdMimeType, photo.hdData, photo.hdMimeType, photo.sdData.byteLength, photo.hdData.byteLength]
  )
  const result = d.exec('SELECT last_insert_rowid() as id')
  const id = result[0].values[0][0] as number
  scheduleSave()
  return id
}

export function getPlantPhotos(options: PhotoFilterOptions | number = 24): PlantPhoto[] {
  const d = getDatabase()
  const opts: PhotoFilterOptions = typeof options === 'number' ? { limit: options } : options
  const where: string[] = []
  const params: SqlValue[] = []

  if (opts.tag) {
    where.push('tag = ?')
    params.push(opts.tag)
  }
  if (opts.search?.trim()) {
    const term = `%${opts.search.trim()}%`
    where.push('(tag LIKE ? OR note LIKE ?)')
    params.push(term, term)
  }
  if (opts.synced === 'synced') where.push('synced = 1')
  if (opts.synced === 'unsynced') where.push('synced = 0')

  const sortMap: Record<NonNullable<PhotoFilterOptions['sort']>, string> = {
    date: 'created_at',
    tag: 'tag COLLATE NOCASE',
    size: '(sd_size_bytes + hd_size_bytes)',
  }
  const sort = sortMap[opts.sort || 'date']
  const order = opts.order === 'asc' ? 'ASC' : 'DESC'
  const limit = opts.limit ?? 200
  params.push(limit)

  const result = d.exec(`SELECT ${PHOTO_COLUMNS} FROM plant_photos ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} ${order}, id DESC LIMIT ?`, params)
  if (result.length === 0) return []
  return result[0].values.map(rowToPhoto)
}

export function getPlantPhotoTags(): string[] {
  const d = getDatabase()
  const result = d.exec('SELECT DISTINCT tag FROM plant_photos WHERE tag != "" ORDER BY tag COLLATE NOCASE')
  if (result.length === 0) return []
  return result[0].values.map((row: unknown[]) => row[0] as string)
}

export function getUnsyncedPlantPhotos(): PlantPhoto[] {
  const d = getDatabase()
  const result = d.exec(`SELECT ${PHOTO_COLUMNS} FROM plant_photos WHERE synced = 0 AND hd_data IS NOT NULL ORDER BY id ASC`)
  if (result.length === 0) return []
  return result[0].values.map(rowToPhoto)
}

export function updatePlantPhoto(id: number, photo: { tag?: string; note?: string }): void {
  const d = getDatabase()
  const updates: string[] = []
  const params: SqlValue[] = []
  if (photo.tag !== undefined) {
    updates.push('tag = ?')
    params.push(photo.tag.trim())
  }
  if (photo.note !== undefined) {
    updates.push('note = ?')
    params.push(photo.note.trim())
  }
  if (updates.length === 0) return
  updates.push('synced = CASE WHEN hd_data IS NOT NULL THEN 0 ELSE synced END')
  params.push(id)
  d.run(`UPDATE plant_photos SET ${updates.join(', ')} WHERE id = ?`, params)
  scheduleSave()
}

export function markPlantPhotoSynced(id: number, notionPageId: string, notionFileUploadId: string): void {
  const d = getDatabase()
  d.run(
    `UPDATE plant_photos
     SET notion_page_id = ?, notion_file_upload_id = ?, synced = 1, hd_data = NULL
     WHERE id = ?`,
    [notionPageId, notionFileUploadId, id]
  )
  scheduleSave()
}

export function deletePlantPhoto(id: number): void {
  const d = getDatabase()
  d.run('DELETE FROM plant_photos WHERE id = ?', [id])
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

export function getEntryByNotionPageId(notionPageId: string): LogEntry | null {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM log_entries WHERE notion_page_id = ?', [notionPageId])
  if (result.length === 0 || result[0].values.length === 0) return null
  return rowToEntry(result[0].values[0])
}

/**
 * Update a local entry from Notion data.
 * Unlike updateEntry(), this does NOT set synced = 0 because the update
 * originates from Notion (the entry is already in sync).
 */
export function updateEntryFromNotion(id: number, entry: {
  note?: string
  date?: string
  noteType?: string
  object?: string
  objectGroup?: string
  objectType?: string
  source?: string
}): void {
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
  // Do NOT set synced = 0 — this update comes from Notion, entry stays in sync
  values.push(id)

  d.run(`UPDATE log_entries SET ${fields.join(', ')} WHERE id = ?`, values)
  scheduleSave()
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
 * Count local entries whose notionPageId is NOT in the provided set of remote IDs.
 * Entries are intentionally retained locally even if they are missing from Notion.
 * This preserves the app as a non-destructive local mirror/cache.
 */
export function countEntriesMissingFromNotion(remotePageIds: Set<string>): number {
  const d = getDatabase()
  // Find all local entries that have a notionPageId but it's not in the remote set
  const result = d.exec("SELECT id, notion_page_id FROM log_entries WHERE notion_page_id IS NOT NULL AND notion_page_id != ''")
  if (result.length === 0) return 0

  let missing = 0
  for (const row of result[0].values) {
    const pageId = row[1] as string
    if (!remotePageIds.has(pageId)) {
      missing++
    }
  }

  return missing
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

export function addTag(tag: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string; sortOrder?: number }): number {
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

export function upsertTagsFromNotion(tags: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string }[]): number {
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

export function replaceNoteTypeTagsFromNotionEntries(entries: { noteType: string }[]): number {
  const d = getDatabase()
  const noteTypes = Array.from(new Set(entries.map(e => e.noteType).filter(Boolean)))

  d.run('BEGIN TRANSACTION')
  try {
    d.run("DELETE FROM tags WHERE category = 'note_type'")
    noteTypes.forEach((name, index) => {
      d.run(
        'INSERT INTO tags (name, category, color, sort_order, synced) VALUES (?, ?, ?, ?, 1)',
        [name, 'note_type', getNoteTypeColor(name), index]
      )
    })
    d.run('COMMIT')
  } catch {
    d.run('ROLLBACK')
    return 0
  }

  scheduleSave()
  return noteTypes.length
}

/**
 * Derive and upsert object_type, object_group, and object tags from entry data.
 * Uses hierarchical naming: "type|group" for groups, "type|group|name" for objects.
 * This ensures the hierarchy builder in getObjectHierarchy() works correctly.
 */
export function upsertEntryTags(entries: { objectType: string; objectGroup: string; object: string }[]): number {
  const d = getDatabase()
  let upserted = 0
  d.run('BEGIN TRANSACTION')
  try {
    for (const entry of entries) {
      // Upsert object_type tag (flat name)
      if (entry.objectType) {
        const existing = d.exec('SELECT id FROM tags WHERE name = ? AND category = ?', [entry.objectType, 'object_type'])
        if (existing.length === 0 || existing[0].values.length === 0) {
          const color = getNoteTypeColor(entry.objectType)
          d.run('INSERT OR IGNORE INTO tags (name, category, color, sort_order, synced) VALUES (?, ?, ?, 0, 1)', [entry.objectType, 'object_type', color])
          upserted++
        }
      }
      // Upsert object_group tag (hierarchical: "type|group")
      if (entry.objectType && entry.objectGroup) {
        const hierarchicalName = `${entry.objectType}|${entry.objectGroup}`
        const existing = d.exec('SELECT id FROM tags WHERE name = ? AND category = ?', [hierarchicalName, 'object_group'])
        if (existing.length === 0 || existing[0].values.length === 0) {
          d.run('INSERT OR IGNORE INTO tags (name, category, color, sort_order, synced) VALUES (?, ?, ?, 0, 1)', [hierarchicalName, 'object_group', ''])
          upserted++
        }
      }
      // Upsert object tag (hierarchical: "type|group|name")
      if (entry.objectType && entry.objectGroup && entry.object) {
        const hierarchicalName = `${entry.objectType}|${entry.objectGroup}|${entry.object}`
        const existing = d.exec('SELECT id FROM tags WHERE name = ? AND category = ?', [hierarchicalName, 'object'])
        if (existing.length === 0 || existing[0].values.length === 0) {
          d.run('INSERT OR IGNORE INTO tags (name, category, color, sort_order, synced) VALUES (?, ?, ?, 0, 1)', [hierarchicalName, 'object', ''])
          upserted++
        }
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

// ─── Sync Logs ──────────────────────────────────────────────────────────

export interface SyncLog {
  id: number
  timestamp: string
  direction: string
  status: string
  pulled: number
  pushed: number
  failed: number
  duplicatesSkipped: number
  deleted: number
  updated: number
  tagsUpserted: number
  durationMs: number
  error: string
}

function rowToSyncLog(row: unknown[]): SyncLog {
  return {
    id: row[0] as number,
    timestamp: row[1] as string,
    direction: row[2] as string,
    status: row[3] as string,
    pulled: row[4] as number,
    pushed: row[5] as number,
    failed: row[6] as number,
    duplicatesSkipped: row[7] as number,
    deleted: row[8] as number,
    tagsUpserted: row[9] as number,
    durationMs: row[10] as number,
    error: row[11] as string,
    updated: (row[12] as number) || 0,
  }
}

export function insertSyncLog(log: Omit<SyncLog, 'id'>): void {
  const d = getDatabase()
  d.run(
    `INSERT INTO sync_logs (timestamp, direction, status, pulled, pushed, failed, duplicates_skipped, deleted, tags_upserted, duration_ms, error, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [log.timestamp, log.direction, log.status, log.pulled, log.pushed, log.failed, log.duplicatesSkipped, log.deleted, log.tagsUpserted, log.durationMs, log.error, log.updated]
  )
  scheduleSave()
}

export function getSyncLogs(limit = 100): SyncLog[] {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?', [limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToSyncLog)
}

function rowToPhotoSyncLog(row: unknown[]): PhotoSyncLog {
  return {
    id: row[0] as number,
    timestamp: row[1] as string,
    status: row[2] as string,
    pushed: row[3] as number,
    failed: row[4] as number,
    totalSizeKb: row[5] as number,
    durationMs: row[6] as number,
    error: row[7] as string,
  }
}

export function insertPhotoSyncLog(log: Omit<PhotoSyncLog, 'id'>): void {
  const d = getDatabase()
  d.run(
    `INSERT INTO photo_sync_logs (timestamp, status, pushed, failed, total_size_kb, duration_ms, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [log.timestamp, log.status, log.pushed, log.failed, log.totalSizeKb, log.durationMs, log.error]
  )
  scheduleSave()
}

export function getPhotoSyncLogs(limit = 100): PhotoSyncLog[] {
  const d = getDatabase()
  const result = d.exec('SELECT * FROM photo_sync_logs ORDER BY id DESC LIMIT ?', [limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToPhotoSyncLog)
}

export function getDbStats(): {
  totalEntries: number
  syncedEntries: number
  unsyncedEntries: number
  totalTags: number
  noteTypeCount: number
  sourceTagCount: number
  objectTypeTagCount: number
  objectGroupTagCount: number
  syncLogCount: number
  photoSyncLogCount: number
  photoCount: number
  photoSizeKB: number
  dbSizeKB: number
} {
  const d = getDatabase()

  const countResult = (sql: string, params?: SqlValue[]): number => {
    const r = d.exec(sql, params)
    if (r.length === 0 || r[0].values.length === 0) return 0
    return r[0].values[0][0] as number
  }

  const totalEntries = countResult('SELECT COUNT(*) FROM log_entries')
  const syncedEntries = countResult("SELECT COUNT(*) FROM log_entries WHERE synced = 1")
  const unsyncedEntries = countResult("SELECT COUNT(*) FROM log_entries WHERE synced = 0")
  const totalTags = countResult('SELECT COUNT(*) FROM tags')
  const noteTypeCount = countResult("SELECT COUNT(*) FROM tags WHERE category = 'note_type'")
  const sourceTagCount = countResult("SELECT COUNT(*) FROM tags WHERE category = 'source'")
  const objectTypeTagCount = countResult("SELECT COUNT(*) FROM tags WHERE category = 'object_type'")
  const objectGroupTagCount = countResult("SELECT COUNT(*) FROM tags WHERE category = 'object_group'")
  const syncLogCount = countResult('SELECT COUNT(*) FROM sync_logs')
  const photoSyncLogCount = countResult('SELECT COUNT(*) FROM photo_sync_logs')
  const photoCount = countResult('SELECT COUNT(*) FROM plant_photos')
  const photoSizeKB = Math.round(countResult('SELECT COALESCE(SUM(sd_size_bytes + hd_size_bytes), 0) FROM plant_photos') / 1024 * 10) / 10

  // Estimate DB size from exported data
  const data = d.export()
  const dbSizeKB = Math.round(data.byteLength / 1024 * 10) / 10

  return {
    totalEntries, syncedEntries, unsyncedEntries,
    totalTags, noteTypeCount, sourceTagCount, objectTypeTagCount, objectGroupTagCount,
    syncLogCount, photoSyncLogCount, photoCount, photoSizeKB, dbSizeKB,
  }
}

export function clearSyncLogs(): void {
  const d = getDatabase()
  d.run('DELETE FROM sync_logs')
  d.run('DELETE FROM photo_sync_logs')
  scheduleSave()
}
