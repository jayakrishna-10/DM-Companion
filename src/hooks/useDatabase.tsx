import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { initDatabase, getDatabase, insertEntry, insertEntryFromNotion, updateEntry, deleteEntry, getEntriesByDate, getEntryCountsByType, searchEntries, getEntries, importFromCSV, clearAllData, exportAllEntries, getObjectHierarchy, getUnsyncedEntries, getExistingNotionPageIds, markAsSynced } from '@/db/database'
import { seedDatabase } from '@/db/seed'
import type { LogEntry, LogEntryFormData, NoteType, ObjectHierarchy, SyncStatus } from '@/types'

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
  importData: (rows: { note: string; date: string; noteType: string; object: string; objectGroup: string; objectType: string; source: string }[]) => number
  clearData: () => void
  exportData: () => LogEntry[]
  syncToNotion: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [entries, setEntries] = useState<Map<string, LogEntry[]>>(new Map())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  const refreshEntries = useCallback(() => {
    if (!isReady) return
    const byDate = getEntriesByDate()
    setEntries(new Map(byDate))
    setCounts(getEntryCountsByType())
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
    if (isReady) refreshEntries()
  }, [isReady, refreshEntries])

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

  const syncToNotion = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      // --- PULL from Notion first ---
      console.log('[sync] Pulling entries from Notion...')
      try {
        const pullRes = await fetch('/api/notion-pull')
        if (pullRes.ok) {
          const pullData = await pullRes.json()
          const existingPageIds = getExistingNotionPageIds()
          const newEntries = pullData.entries.filter(e => !existingPageIds.has(e.notionPageId))

          if (newEntries.length > 0) {
            console.log(`[sync] Pulling ${newEntries.length} new entries from Notion`)
            for (const entry of newEntries) {
              insertEntryFromNotion({
                note: entry.note,
                date: entry.date,
                noteType: entry.noteType,
                object: entry.object,
                objectGroup: entry.objectGroup,
                objectType: entry.objectType,
                source: entry.source,
                notionPageId: entry.notionPageId,
              })
            }
            refreshEntries()
          } else {
            console.log('[sync] No new entries from Notion')
          }
        } else {
          const errData = await pullRes.json().catch(() => ({}))
          console.error('[sync] Pull from Notion failed:', errData.error || pullRes.statusText)
        }
      } catch (pullErr) {
        console.error('[sync] Pull from Notion error:', pullErr)
      }

      // --- PUSH unsynced local entries to Notion ---
      const unsynced = getUnsyncedEntries()
      if (unsynced.length === 0) {
        console.log('[sync] No unsynced entries to push')
        setSyncStatus('synced')
        setLastSyncTime(new Date().toLocaleTimeString())
        return
      }

      console.log(`[sync] Pushing ${unsynced.length} unsynced entries to Notion...`)

      const res = await fetch('/api/notion-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: unsynced.map(e => ({
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
        console.error('[sync] Server responded with error:', res.status, data.error || res.statusText)
        setSyncStatus('error')
        return
      }

      const data = await res.json()
      console.log(`[sync] Push result: ${data.synced.length} synced, ${data.failed.length} failed`)

      if (data.failed.length > 0) {
        console.error('[sync] Failed entries:', data.failed)
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

      setSyncStatus(data.failed.length === 0 ? 'synced' : 'error')
      setLastSyncTime(new Date().toLocaleTimeString())
      refreshEntries()
    } catch (err) {
      console.error('[sync] Network or unexpected error:', err)
      setSyncStatus('error')
    }
  }, [refreshEntries])

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
      getHierarchy: getHierarchyFn, importData, clearData: clearDataFn, exportData, syncToNotion,
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