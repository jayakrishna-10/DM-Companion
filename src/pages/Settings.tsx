import { useState } from 'react'
import Papa from 'papaparse'
import { useDatabase } from '@/hooks/useDatabase'
import { useSync } from '@/hooks/useSync'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Download, Upload, Trash2, Database, Key, Link, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/Toaster'

export function Settings() {
  const { exportData, clearData, importData } = useDatabase()
  const { apiKey, databaseId, saveSettings, sync, syncStatus, lastSyncTime } = useSync()
  const [localApiKey, setLocalApiKey] = useState(apiKey)
  const [localDbId, setLocalDbId] = useState(databaseId)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const handleSave = () => {
    saveSettings(localApiKey, localDbId)
    toast('Settings saved', 'success')
  }

  const handleTestConnection = async () => {
    if (!localApiKey || !localDbId) {
      toast('Please enter API key and Database ID', 'error')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${localDbId}`, {
        headers: {
          'Authorization': `Bearer ${localApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      })
      setTestResult(res.ok ? 'success' : 'error')
      toast(res.ok ? 'Connection successful' : 'Connection failed', res.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
      toast('Connection failed', 'error')
    }
    setTesting(false)
  }

  const handleSync = async () => {
    if (!localApiKey || !localDbId) {
      toast('Configure Notion settings first', 'error')
      return
    }
    await sync()
    toast('Sync completed', 'success')
  }

  const handleExport = () => {
    const data = exportData()
    if (data.length === 0) {
      toast('No data to export', 'info')
      return
    }
    const headers = ['Note', 'Date', 'Note Type', 'Object', 'Object Group', 'Object Type', 'Source']
    const rows = data.map(e => [
      `"${e.note.replace(/"/g, '""')}"`,
      e.date,
      e.noteType,
      e.object,
      e.objectGroup,
      e.objectType,
      e.source,
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dm-companion-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${data.length} entries`, 'success')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
      const rows = result.data.map(row => {
        let dateStr = (row['Date'] || '').trim()
        try {
          const parsed = new Date(dateStr)
          if (!isNaN(parsed.getTime())) {
            dateStr = parsed.toISOString().split('T')[0]
          }
        } catch { }
        return {
          note: (row['Note'] || '').trim(),
          date: dateStr,
          noteType: (row['Note Type'] || 'Activity').trim(),
          object: (row['Object'] || '').trim(),
          objectGroup: (row['Object Group'] || '').trim(),
          objectType: (row['Object Type'] || '').trim(),
          source: (row['Source'] || '').trim(),
        }
      })
      const count = importData(rows)
      toast(`Imported ${count} entries`, 'success')
    }
    input.click()
  }

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearData()
    toast('All data cleared', 'success')
    setConfirmClear(false)
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Notion Integration</h2>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="password"
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="Notion API Key"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div className="relative">
            <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={localDbId}
              onChange={e => setLocalDbId(e.target.value)}
              placeholder="Database ID"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleTestConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-xs font-medium ${testResult === 'success' ? 'text-resolved-light' : 'text-complaint-light'}`}>
              {testResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult === 'success' ? 'Connected successfully' : 'Connection failed'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Sync</h2>
        </div>

        <div className="space-y-3">
          {lastSyncTime && (
            <p className="text-xs text-text-muted">Last synced: {lastSyncTime}</p>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncStatus === 'syncing'}>
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              Sync Now
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Data Management</h2>

        <div className="space-y-2">
          <Button size="sm" variant="secondary" onClick={handleExport} className="w-full justify-start">
            <Download size={14} /> Export Data (CSV)
          </Button>
          <Button size="sm" variant="secondary" onClick={handleImport} className="w-full justify-start">
            <Upload size={14} /> Import Data (CSV)
          </Button>
          <Button size="sm" variant={confirmClear ? 'danger' : 'ghost'} onClick={handleClear} className="w-full justify-start">
            <Trash2 size={14} /> {confirmClear ? 'Confirm Clear All Data?' : 'Clear Local Data'}
          </Button>
        </div>
      </section>

      <section className="pt-4 border-t border-border-subtle">
        <p className="text-xs text-text-muted text-center">
          DM Companion v1.0.0
        </p>
        <p className="text-[10px] text-text-muted text-center mt-1">
          Made for CWTP operators
        </p>
      </section>
    </div>
  )
}
