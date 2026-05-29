import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { initDatabase, getDatabase, insertEntry, insertEntryFromNotion, updateEntry, updateEntryFromNotion, deleteEntry, getEntriesByDate, getEntryCountsByType, searchEntries, getEntries, importFromCSV, clearAllData, exportAllEntries, getObjectHierarchy, getUnsyncedEntries, getExistingNotionPageIds, getEntryByNotionPageId, markAsSynced, isDuplicateEntry, deleteNotionRemovedEntries, getOpenIssues, getTags, getNoteTypes, getSourceTags, addTag, deleteTag, upsertTagsFromNotion, upsertEntryTags, insertSyncLog, getSyncLogs, getDbStats, clearSyncLogs, insertPlantPhoto, getPlantPhotos, getPlantPhotoTags, getUnsyncedPlantPhotos, markPlantPhotoSynced, updatePlantPhoto, deletePlantPhoto, insertPhotoSyncLog, getPhotoSyncLogs } from '@/db/database'
import { seedDatabase } from '@/db/seed'
import type { LogEntry, LogEntryFormData, NoteType, ObjectHierarchy, OpenIssue, SyncStatus, Tag, SyncLog, DbStats, PlantPhoto, PhotoFilterOptions, PhotoSyncLog } from '@/types'

interface DatabaseContextType {
  isReady: boolean
  entries: Map<string, LogEntry[]>
  counts: Record<string, number>
  syncStatus: SyncStatus
  lastSyncTime: string | null
  refreshEntries: () => void
  addEntry: (entry: LogEntryFormData) => number
  editEntry: (id: number, entry: Partial<LogEntryFormData>) => void
  removeEntry: (id: number) => void
  search: (query: string) => LogEntry[]
  filterEntries: (options?: { noteType?: NoteType; objectType?: string; search?: string }) => LogEntry[]
  getHierarchy: () => ObjectHierarchy
  getOpenIssues: () => OpenIssue[]
  importData: (rows: { note: string; date: string; noteType: string; object: string; objectGroup: string; objectType: string; source: string }[]) => number
  clearData: () => void
  exportData: () => LogEntry[]
  syncToNotion: () => Promise<void>
  // Tag management
  tags: Tag[]
  noteTypes: string[]
  sourceTags: string[]
  addTag: (tag: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string }) => void
  removeTag: (id: number) => void
  refreshTags: () => void
  // Logs & stats
  syncLogs: SyncLog[]
  photoSyncLogs: PhotoSyncLog[]
  dbStats: DbStats | null
  clearLogs: () => void
  refreshLogs: () => void
  photos: PlantPhoto[]
  photoTags: string[]
  addPhoto: (photos: { tag: string; note?: string; sdData: Uint8Array; sdMimeType: string; hdData: Uint8Array; hdMimeType: string }[]) => number[]
  updatePhoto: (id: number, photo: { tag?: string; note?: string }) => void
  removePhoto: (id: number) => void
  filterPhotos: (options?: PhotoFilterOptions) => PlantPhoto[]
  refreshPhotos: () => void
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [entries, setEntries] = useState<Map<string, LogEntry[]>>(new Map())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [noteTypes, setNoteTypes] = useState<string[]>([])
  const [sourceTags, setSourceTags] = useState<string[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [photoSyncLogs, setPhotoSyncLogs] = useState<PhotoSyncLog[]>([])
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [photos, setPhotos] = useState<PlantPhoto[]>([])
  const [photoTags, setPhotoTags] = useState<string[]>([])
  const syncInProgressRef = useRef(false)
  const refreshEntries = useCallback(() => {
    if (!isReady) return
    const byDate = getEntriesByDate()
    setEntries(new Map(byDate))
    setCounts(getEntryCountsByType())
  }, [isReady])

  const refreshTags = useCallback(() => {
    if (!isReady) return
    setTags(getTags())
    setNoteTypes(getNoteTypes())
    setSourceTags(getSourceTags())
  }, [isReady])

  const refreshLogs = useCallback(() => {
    if (!isReady) return
    setSyncLogs(getSyncLogs(100))
    setPhotoSyncLogs(getPhotoSyncLogs(100))
    setDbStats(getDbStats())
  }, [isReady])

  const refreshPhotos = useCallback(() => {
    if (!isReady) return
    setPhotos(getPlantPhotos({ limit: 500 }))
    setPhotoTags(getPlantPhotoTags())
  }, [isReady])

  useEffect(() => {
    initDatabase().then(() => {
      return seedDatabase()
    }).then(() => {
      setIsReady(true)
      setSyncStatus(navigator.onLine ? 'synced' : 'offline')
    }).catch((err) => {
      console.error('Database initialization failed:', err)
      setIsReady(true)
      setSyncStatus('offline')
    })
  }, [])

  useEffect(() => {
    if (isReady) {
      refreshEntries()
      refreshTags()
      refreshLogs()
      refreshPhotos()
    }
  }, [isReady, refreshEntries, refreshTags, refreshLogs, refreshPhotos])

  useEffect(() => {
    const handleOnline = () => setSyncStatus('synced')
    const handleOffline = () => setSyncStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const editEntry = useCallback((id: number, entry: Partial<LogEntryFormData>) => {
    updateEntry(id, {
      note: entry.note,
      date: entry.date,
      noteType: entry.noteType,
      object: entry.object,
      objectGroup: entry.objectGroup,
      objectType: entry.objectType,
      source: entry.source,
    })
    refreshEntries()
  }, [refreshEntries])

  const removeEntry = useCallback((id: number) => {
    deleteEntry(id)
    refreshEntries()
  }, [refreshEntries])

  const search = useCallback((query: string): LogEntry[] => {
    if (!query.trim()) return []
    return searchEntries(query)
  }, [])

  const filterEntries = useCallback((options?: { noteType?: NoteType; objectType?: string; search?: string }) => {
    return getEntries(options)
  }, [])

  const getHierarchyFn = useCallback((): ObjectHierarchy => {
    return getObjectHierarchy()
  }, [])

  const getOpenIssuesFn = useCallback((): OpenIssue[] => {
    return getOpenIssues()
  }, [])

  const importData = useCallback((rows: { note: string; date: string; noteType: string; object: string; objectGroup: string; objectType: string; source: string }[]) => {
    const count = importFromCSV(rows)
    refreshEntries()
    return count
  }, [refreshEntries])

  const clearDataFn = useCallback(() => {
    clearAllData()
    refreshEntries()
  }, [refreshEntries])

  const exportData = useCallback((): LogEntry[] => {
    return exportAllEntries()
  }, [])

  const addTagFn = useCallback((tag: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string }) => {
    addTag(tag)
    refreshTags()
  }, [refreshTags])

  const removeTagFn = useCallback((id: number) => {
    deleteTag(id)
    refreshTags()
  }, [refreshTags])

  const clearLogsFn = useCallback(() => {
    clearSyncLogs()
    refreshLogs()
  }, [refreshLogs])

  const syncToNotion = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log('[sync] Sync already in progress, skipping')
      return
    }
    syncInProgressRef.current = true
    setSyncStatus('syncing')
    const startTime = Date.now()

    // Track sync metrics
    let totalPulled = 0
    let totalPushed = 0
    let totalFailed = 0
    let totalDuplicatesSkipped = 0
    let totalDeleted = 0
    let totalUpdated = 0
    let totalTagsUpserted = 0
    let syncError = ''

    try {
      // --- PULL from Notion first ---
      console.log('[sync] Pulling entries from Notion...')
      let pullFailed = false
      try {
        // Fetch schema (tag options) first
        try {
          const schemaRes = await fetch('/api/notion-schema')
          if (schemaRes.ok) {
            const schemaData = await schemaRes.json()
            const notionTags: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string }[] = []

            // Map note type options
            for (const opt of (schemaData.noteTypes || [])) {
              notionTags.push({ name: opt.name, category: 'note_type', color: opt.color })
            }
            // Map source options
            for (const opt of (schemaData.sources || [])) {
              notionTags.push({ name: opt.name, category: 'source', color: opt.color })
            }
            // Map object type options
            for (const opt of (schemaData.objectTypes || [])) {
              notionTags.push({ name: opt.name, category: 'object_type', color: opt.color })
            }
            // Map object group options (flat names from Notion schema)
            for (const opt of (schemaData.objectGroups || [])) {
              notionTags.push({ name: opt.name, category: 'object_group', color: opt.color })
            }
            // Map object options (flat names from Notion schema)
            for (const opt of (schemaData.objects || [])) {
              notionTags.push({ name: opt.name, category: 'object', color: opt.color })
            }

            if (notionTags.length > 0) {
              const upserted = upsertTagsFromNotion(notionTags)
              if (upserted > 0) {
                console.log(`[sync] Upserted ${upserted} new tags from Notion schema`)
                totalTagsUpserted += upserted
                refreshTags()
              }
            }
          }
        } catch (schemaErr) {
          console.warn('[sync] Failed to fetch Notion schema (non-fatal):', schemaErr)
        }

        const pullRes = await fetch('/api/notion-pull')
        if (pullRes.ok) {
          const pullData = await pullRes.json()
          console.log('[sync] Pull response:', pullData.entries?.length ?? 0, 'entries from Notion')
          const existingPageIds = getExistingNotionPageIds()
          console.log('[sync] Existing page IDs in local DB:', existingPageIds.size)
          const allEntries = (pullData.entries as { note: string; date: string; noteType: string; object: string; objectGroup: string; objectType: string; source: string; notionPageId: string }[])

          // Build set of all remote page IDs for deletion detection
          const remotePageIds = new Set(allEntries.map(e => e.notionPageId))

          // --- Delete local entries that were removed from Notion ---
          const deletedCount = deleteNotionRemovedEntries(remotePageIds)
          if (deletedCount > 0) {
            console.log(`[sync] Deleted ${deletedCount} local entries that were removed from Notion`)
            totalDeleted += deletedCount
          }

          // --- Insert new entries (deduplicated by pageId AND content) ---
          const newEntries = allEntries.filter((e) => !existingPageIds.has(e.notionPageId))
          let inserted = 0
          let duplicatesSkipped = 0

          if (newEntries.length > 0) {
            for (const entry of newEntries) {
              // Content-based dedup: skip if an identical entry already exists locally
              if (isDuplicateEntry({
                note: entry.note,
                date: entry.date,
                noteType: entry.noteType,
                object: entry.object,
                objectGroup: entry.objectGroup,
                objectType: entry.objectType,
              })) {
                console.log(`[sync] Skipping duplicate from Notion: "${entry.note.substring(0, 40)}..."`)
                duplicatesSkipped++
                continue
              }

              insertEntryFromNotion({
                note: entry.note,
                date: entry.date,
                noteType: entry.noteType as NoteType,
                object: entry.object,
                objectGroup: entry.objectGroup,
                objectType: entry.objectType,
                source: entry.source,
                notionPageId: entry.notionPageId,
              })
              inserted++
            }
            totalPulled += inserted
            totalDuplicatesSkipped += duplicatesSkipped
            if (inserted > 0) {
              console.log(`[sync] Inserted ${inserted} new entries from Notion`)
            }
            if (duplicatesSkipped > 0) {
              console.log(`[sync] Skipped ${duplicatesSkipped} duplicate entries from Notion`)
            }
            refreshEntries()
          } else {
            console.log('[sync] No new entries from Notion (all', allEntries.length, 'already exist locally)')
          }

          // --- Update existing entries whose Notion data differs ---
          const existingNotionEntries = allEntries.filter((e) => existingPageIds.has(e.notionPageId))
          let updatedFromNotion = 0

          for (const entry of existingNotionEntries) {
            const localEntry = getEntryByNotionPageId(entry.notionPageId)
            if (localEntry) {
              // Check if any field differs
              if (localEntry.note !== entry.note ||
                  localEntry.date !== entry.date ||
                  localEntry.noteType !== entry.noteType ||
                  localEntry.object !== (entry.object || '') ||
                  localEntry.objectGroup !== (entry.objectGroup || '') ||
                  localEntry.objectType !== (entry.objectType || '') ||
                  localEntry.source !== (entry.source || '')) {
                updateEntryFromNotion(localEntry.id, {
                  note: entry.note,
                  date: entry.date,
                  noteType: entry.noteType,
                  object: entry.object || '',
                  objectGroup: entry.objectGroup || '',
                  objectType: entry.objectType || '',
                  source: entry.source || '',
                })
                updatedFromNotion++
              }
            }
          }

          if (updatedFromNotion > 0) {
            console.log(`[sync] Updated ${updatedFromNotion} local entries from Notion`)
            totalUpdated += updatedFromNotion
            refreshEntries()
          }

          // --- Upsert entry-derived tags (object_type, object_group, object) ---
          const entriesWithObjects = allEntries.filter(e => e.objectType || e.objectGroup || e.object)
          if (entriesWithObjects.length > 0) {
            const entryTagsUpserted = upsertEntryTags(entriesWithObjects.map(e => ({
              objectType: e.objectType,
              objectGroup: e.objectGroup,
              object: e.object,
            })))
            if (entryTagsUpserted > 0) {
              console.log(`[sync] Upserted ${entryTagsUpserted} entry-derived tags`)
              totalTagsUpserted += entryTagsUpserted
              refreshTags()
            }
          }
        } else {
          const errData = await pullRes.json().catch(() => ({}))
          console.error('[sync] Pull from Notion failed:', pullRes.status, errData.error || pullRes.statusText)
          syncError = `Pull failed: ${pullRes.status} ${errData.error || pullRes.statusText}`
          pullFailed = true
        }
      } catch (pullErr) {
        console.error('[sync] Pull from Notion error:', pullErr)
        syncError = `Pull error: ${pullErr instanceof Error ? pullErr.message : String(pullErr)}`
        pullFailed = true
      }

      // --- PUSH unsynced local entries to Notion ---
      const unsynced = getUnsyncedEntries()
      if (unsynced.length === 0) {
        console.log('[sync] No unsynced entries to push')
      } else {
        // Separate into creates (no notionPageId) and updates (has notionPageId)
        const toCreate = unsynced.filter(e => !e.notionPageId)
        const toUpdate = unsynced.filter(e => !!e.notionPageId)

        // --- CREATE new entries ---
        if (toCreate.length > 0) {
          console.log(`[sync] Creating ${toCreate.length} new entries in Notion...`)

          const res = await fetch('/api/notion-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entries: toCreate.map(e => ({
                id: e.id,
                note: e.note,
                date: e.date,
                noteType: e.noteType,
                object: e.object,
                objectGroup: e.objectGroup,
                objectType: e.objectType,
                source: e.source,
              })),
            }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            console.error('[sync] Create push failed:', res.status, data.error || res.statusText)
            syncError += (syncError ? '; ' : '') + `Create push failed: ${res.status} ${data.error || res.statusText}`
            totalFailed += toCreate.length
          } else {
            const data = await res.json()
            console.log(`[sync] Create result: ${data.synced.length} synced, ${data.failed.length} failed`)

            totalPushed += data.synced.length
            totalFailed += data.failed.length

            if (data.failed.length > 0) {
              console.error('[sync] Failed creates:', data.failed)
            }

            const database = getDatabase()
            const syncedIds: number[] = []

            for (const synced of data.synced) {
              syncedIds.push(synced.id)
              database.run('UPDATE log_entries SET notion_page_id = ? WHERE id = ?', [synced.notionPageId, synced.id])
            }

            if (syncedIds.length > 0) {
              markAsSynced(syncedIds)
            }
          }
        }

        // --- UPDATE existing entries ---
        if (toUpdate.length > 0) {
          console.log(`[sync] Updating ${toUpdate.length} entries in Notion...`)

          const updateRes = await fetch('/api/notion-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updates: toUpdate.map(e => ({
                id: e.id,
                notionPageId: e.notionPageId,
                note: e.note,
                date: e.date,
                noteType: e.noteType,
                object: e.object,
                objectGroup: e.objectGroup,
                objectType: e.objectType,
                source: e.source,
              })),
            }),
          })

          if (!updateRes.ok) {
            const data = await updateRes.json().catch(() => ({}))
            console.error('[sync] Update push failed:', updateRes.status, data.error || updateRes.statusText)
            syncError += (syncError ? '; ' : '') + `Update push failed: ${updateRes.status} ${data.error || updateRes.statusText}`
            totalFailed += toUpdate.length
          } else {
            const data = await updateRes.json()
            console.log(`[sync] Update result: ${data.updated.length} updated, ${data.failed.length} failed`)

            totalUpdated += data.updated.length
            totalFailed += data.failed.length

            if (data.failed.length > 0) {
              console.error('[sync] Failed updates:', data.failed)
            }

            // Mark successfully updated entries as synced
            const updatedIds: number[] = data.updated.map((u: { id: number }) => u.id)
            if (updatedIds.length > 0) {
              markAsSynced(updatedIds)
            }
          }
        }
      }

      // --- PUSH unsynced plant photos to Notion ---
      const unsyncedPhotos = getUnsyncedPlantPhotos()
      if (unsyncedPhotos.length > 0 && navigator.onLine) {
        const photoStartTime = Date.now()
        let photoSyncError = ''
        let photoPushed = 0
        let photoFailed = 0
        console.log(`[sync] Backing up ${unsyncedPhotos.length} plant photos to Notion...`)
        const photoChunks: PlantPhoto[][] = []
        for (let i = 0; i < unsyncedPhotos.length; i += 3) photoChunks.push(unsyncedPhotos.slice(i, i + 3))

        for (const chunk of photoChunks) {
          const photoRes = await fetch('/api/notion-photo-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photos: chunk.map(photo => ({
                id: photo.id,
                tag: photo.tag,
                name: photo.tag,
                note: photo.note,
                filename: `${photo.tag.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'plant-photo'}-${photo.id}.jpg`,
                mimeType: photo.hdMimeType,
                base64Data: photo.hdData ? bytesToBase64(photo.hdData) : '',
                hdSizeBytes: photo.hdSizeBytes,
                approxSizeKb: Math.max(1, Math.round(photo.hdSizeBytes / 1024)),
                sdSizeBytes: photo.sdSizeBytes,
                createdAt: photo.createdAt,
              })),
            }),
          })

          if (!photoRes.ok) {
            const data = await photoRes.json().catch(() => ({}))
            console.error('[sync] Photo backup failed:', photoRes.status, data.error || photoRes.statusText)
            const chunkError = `Photo backup failed: ${photoRes.status} ${data.error || photoRes.statusText}`
            photoSyncError += (photoSyncError ? '; ' : '') + chunkError
            syncError += (syncError ? '; ' : '') + chunkError
            totalFailed += chunk.length
            photoFailed += chunk.length
            continue
          }

          const data = await photoRes.json()
          photoPushed += data.synced.length
          photoFailed += data.failed.length
          totalPushed += data.synced.length
          totalFailed += data.failed.length

          for (const synced of data.synced as { id: number; notionPageId: string; notionFileUploadId: string }[]) {
            markPlantPhotoSynced(synced.id, synced.notionPageId, synced.notionFileUploadId)
          }

          if (data.failed.length > 0) {
            console.error('[sync] Failed photo backups:', data.failed)
            photoSyncError += (photoSyncError ? '; ' : '') + data.failed.map((failure: { id: number; error: string }) => `#${failure.id}: ${failure.error}`).join('; ')
          }
        }
        refreshPhotos()
        insertPhotoSyncLog({
          timestamp: new Date().toISOString(),
          status: photoFailed > 0 ? 'error' : 'synced',
          pushed: photoPushed,
          failed: photoFailed,
          totalSizeKb: Math.round(unsyncedPhotos.reduce((sum, photo) => sum + photo.hdSizeBytes, 0) / 1024),
          durationMs: Date.now() - photoStartTime,
          error: photoSyncError,
        })
      }

      const finalStatus = (pullFailed || totalFailed > 0) ? 'error' : 'synced'
      setSyncStatus(finalStatus as SyncStatus)
      setLastSyncTime(new Date().toLocaleTimeString())
      refreshEntries()

      // Log the sync event
      const durationMs = Date.now() - startTime
      insertSyncLog({
        timestamp: new Date().toISOString(),
        direction: 'both',
        status: finalStatus,
        pulled: totalPulled,
        pushed: totalPushed,
        failed: totalFailed,
        duplicatesSkipped: totalDuplicatesSkipped,
        deleted: totalDeleted,
        updated: totalUpdated,
        tagsUpserted: totalTagsUpserted,
        durationMs,
        error: syncError,
      })
      refreshLogs()
    } catch (err) {
      console.error('[sync] Network or unexpected error:', err)
      setSyncStatus('error')

      // Log the failed sync
      const durationMs = Date.now() - startTime
      insertSyncLog({
        timestamp: new Date().toISOString(),
        direction: 'both',
        status: 'error',
        pulled: totalPulled,
        pushed: totalPushed,
        failed: totalFailed,
        duplicatesSkipped: totalDuplicatesSkipped,
        deleted: totalDeleted,
        updated: totalUpdated,
        tagsUpserted: totalTagsUpserted,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      })
      refreshLogs()
    } finally {
      syncInProgressRef.current = false
    }
  }, [refreshEntries, refreshTags, refreshLogs, refreshPhotos])

  const addPhoto = useCallback((newPhotos: { tag: string; note?: string; sdData: Uint8Array; sdMimeType: string; hdData: Uint8Array; hdMimeType: string }[]): number[] => {
    const ids = newPhotos.map(insertPlantPhoto)
    refreshPhotos()
    if (navigator.onLine) syncToNotion()
    return ids
  }, [refreshPhotos, syncToNotion])

  const updatePhoto = useCallback((id: number, photo: { tag?: string; note?: string }) => {
    updatePlantPhoto(id, photo)
    refreshPhotos()
  }, [refreshPhotos])

  const removePhoto = useCallback((id: number) => {
    deletePlantPhoto(id)
    refreshPhotos()
  }, [refreshPhotos])

  const filterPhotos = useCallback((options?: PhotoFilterOptions): PlantPhoto[] => {
    return getPlantPhotos(options || { limit: 200 })
  }, [])

  // Auto-sync on new entry
  const addEntry = useCallback((entry: LogEntryFormData): number => {
    const id = insertEntry({
      note: entry.note,
      date: entry.date,
      noteType: entry.noteType,
      object: entry.object,
      objectGroup: entry.objectGroup,
      objectType: entry.objectType,
      source: entry.source,
    })
    refreshEntries()
    syncToNotion()
    return id
  }, [refreshEntries, syncToNotion])

  // Hourly auto-sync
  useEffect(() => {
    const HOUR = 60 * 60 * 1000
    const interval = setInterval(() => {
      if (navigator.onLine) {
        console.log('[sync] Hourly auto-sync triggered')
        syncToNotion()
      }
    }, HOUR)
    return () => clearInterval(interval)
  }, [syncToNotion])

  return (
    <DatabaseContext.Provider value={{
      isReady, entries, counts, syncStatus, lastSyncTime,
      refreshEntries, addEntry, editEntry, removeEntry, search, filterEntries,
      getHierarchy: getHierarchyFn, getOpenIssues: getOpenIssuesFn, importData, clearData: clearDataFn, exportData, syncToNotion,
      tags, noteTypes, sourceTags, addTag: addTagFn, removeTag: removeTagFn, refreshTags,
      syncLogs, photoSyncLogs, dbStats, clearLogs: clearLogsFn, refreshLogs,
      photos, photoTags, addPhoto, updatePhoto, removePhoto, filterPhotos, refreshPhotos,
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider')
  return ctx
}
