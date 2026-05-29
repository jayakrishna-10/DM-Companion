import { useState } from 'react'
import Papa from 'papaparse'
import { useDatabase } from '@/hooks/useDatabase'
import { useSync } from '@/hooks/useSync'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Download, Upload, Trash2, Database, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/Toaster'

export function Settings() {
  const { exportData, clearData, importData } = useDatabase()
  const { sync, syncStatus, lastSyncTime } = useSync()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

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
          dateStr = (row['Date'] || '').trim()
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

  return (
    <div className="page-shell">
      <div className="content-grid max-w-4xl space-y-5">
      <section className="rounded-3xl border border-slate-4/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.13),transparent_38%),linear-gradient(145deg,rgba(28,28,36,0.92),rgba(5,5,7,0.92))] p-5">
        <p className="section-label text-cyan-light">System preferences</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-heading">Connection, sync, and local data</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">Tune Notion connectivity and move records in or out without losing the local-first safety model.</p>
      </section>

      <section className="metric-card space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-cyan-light" />
          <h2 className="section-label">Notion Integration</h2>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Notion API key and Database ID are configured server-side via environment variables.
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleTestConnection} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm font-semibold ${testResult === 'success' ? 'text-resolved-light' : 'text-complaint-light'}`}>
              {testResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult === 'success' ? 'Connected successfully' : 'Connection failed'}
            </div>
          )}
        </div>
      </section>

      <section className="metric-card space-y-4 p-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-cyan-light" />
          <h2 className="section-label">Sync</h2>
        </div>

        <div className="space-y-3">
          {lastSyncTime && (
            <p className="text-sm text-text-muted">Last synced: <span className="font-data text-heading">{lastSyncTime}</span></p>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncStatus === 'syncing'}>
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              Sync Now
            </Button>
          </div>
        </div>
      </section>

      <section className="metric-card space-y-4 p-4">
        <h2 className="section-label">Data Management</h2>

        <div className="grid gap-2 sm:grid-cols-3">
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

      <section className="border-t border-slate-4/60 pt-4">
        <p className="text-center font-data text-[10px] text-label">
          DM Companion v1.0.0
        </p>
        <p className="mt-1 text-center font-data text-[10px] text-label">
          Made for CWTP operators
        </p>
      </section>
      </div>
    </div>
  )
}
