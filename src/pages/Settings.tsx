import { useState } from 'react'
import Papa from 'papaparse'
import { useDatabase } from '@/hooks/useDatabase'
import { useSync } from '@/hooks/useSync'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Download, Upload, Trash2, Database, CheckCircle2, AlertCircle, CloudDownload } from 'lucide-react'
import { toast } from '@/components/ui/Toaster'

export function Settings() {
  const { exportData, clearData, importData, reloadFromNotion } = useDatabase()
  const { sync, syncStatus, lastSyncTime } = useSync()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReload, setConfirmReload] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notion-test')
      const data = await res.json()
      setTestResult(data.success ? 'success' : 'error')
      toast(data.success ? 'Connection successful' : (data.error || 'Connection failed'), data.success ? 'success' : 'error')
    } catch {
      setTestResult('error')
      toast('Connection failed', 'error')
    }
    setTesting(false)
  }

  const handleSync = async () => {
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
        } catch {
          // Keep the original CSV date value if parsing fails.
        }
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

  const handleReloadFromNotion = async () => {
    if (!confirmReload) {
      setConfirmReload(true)
      setTimeout(() => setConfirmReload(false), 5000)
      return
    }
    try {
      await reloadFromNotion()
      toast('Reloaded local entries from Notion', 'success')
      setConfirmReload(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reload from Notion failed', 'error')
    }
  }

  return (
    <div className="p-4 space-y-6 pb-24 bg-neutral-950">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-teal-400" />
          <h2 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Notion Integration</h2>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] text-neutral-400">
            Notion API key and Database ID are configured server-side via environment variables.
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleTestConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-[11px] font-medium ${testResult === 'success' ? 'text-resolved-light' : 'text-complaint-light'}`}>
              {testResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult === 'success' ? 'Connected successfully' : 'Connection failed'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-teal-400" />
          <h2 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Sync</h2>
        </div>

        <div className="space-y-3">
          {lastSyncTime && (
            <p className="text-[11px] text-neutral-400">Last synced: {lastSyncTime}</p>
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
        <h2 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Data Management</h2>

        <div className="space-y-2">
          <Button size="sm" variant="secondary" onClick={handleExport} className="w-full justify-start">
            <Download size={14} /> Export Data (CSV)
          </Button>
          <Button size="sm" variant="secondary" onClick={handleImport} className="w-full justify-start">
            <Upload size={14} /> Import Data (CSV)
          </Button>
          <Button size="sm" variant={confirmReload ? 'danger' : 'secondary'} onClick={handleReloadFromNotion} disabled={syncStatus === 'syncing'} className="w-full justify-start">
            <CloudDownload size={14} /> {confirmReload ? 'Confirm Reload from Notion?' : 'Reload Local Entries from Notion'}
          </Button>
          <Button size="sm" variant={confirmClear ? 'danger' : 'ghost'} onClick={handleClear} className="w-full justify-start">
            <Trash2 size={14} /> {confirmClear ? 'Confirm Clear All Data?' : 'Clear Local Data'}
          </Button>
        </div>
      </section>

      <section className="pt-4 border-t border-neutral-800/50">
        <p className="text-[10px] text-neutral-500 text-center">
          DM Companion v1.0.0
        </p>
        <p className="text-[10px] text-neutral-500 text-center mt-1">
          Made for CWTP operators
        </p>
      </section>
    </div>
  )
}
