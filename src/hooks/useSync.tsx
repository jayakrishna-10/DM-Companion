import { useState, useEffect, useCallback } from 'react'
import { useDatabase } from './useDatabase'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function useSync() {
  const { syncStatus, lastSyncTime, syncToNotion, refreshEntries } = useDatabase()
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('notion_api_key') || '')
  const [databaseId, setDatabaseId] = useState(() => sessionStorage.getItem('notion_database_id') || '')

  const saveSettings = useCallback((key: string, id: string) => {
    setApiKey(key)
    setDatabaseId(id)
    sessionStorage.setItem('notion_api_key', key)
    sessionStorage.setItem('notion_database_id', id)
  }, [])

  const sync = useCallback(async () => {
    if (!apiKey || !databaseId) return
    await syncToNotion(apiKey, databaseId)
  }, [apiKey, databaseId, syncToNotion])

  return { syncStatus, lastSyncTime, apiKey, databaseId, saveSettings, sync, refreshEntries }
}