import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EntryForm } from '@/components/entry/EntryForm'
import type { LogEntryFormData } from '@/types'
import { useDatabase } from '@/hooks/useDatabase'
import { getEntry } from '@/db/database'

export function NewEntry() {
  const { addEntry } = useDatabase()
  const [searchParams] = useSearchParams()
  const editIdParam = searchParams.get('edit')
  const editId = editIdParam ? Number(editIdParam) : undefined

  const [initialData, setInitialData] = useState<LogEntryFormData | undefined>(undefined)
  const [loading, setLoading] = useState(editIdParam !== null)

  useEffect(() => {
    if (editId !== undefined) {
      const entry = getEntry(editId)
      if (entry) {
        setInitialData({
          note: entry.note,
          date: entry.date,
          noteType: entry.noteType,
          object: entry.object,
          objectGroup: entry.objectGroup,
          objectType: entry.objectType,
          source: entry.source,
        })
      }
      setLoading(false)
    } else {
      // Build initial data from query params for prefill (e.g. from Profiles / Equipment)
      const prefilled: LogEntryFormData = {
        note: searchParams.get('note') || '',
        date: searchParams.get('date') || new Date().toISOString().split('T')[0],
        noteType: searchParams.get('noteType') || 'Activity',
        object: searchParams.get('object') || '',
        objectGroup: searchParams.get('objectGroup') || '',
        objectType: searchParams.get('objectType') || '',
        source: searchParams.get('source') || 'CWTP logbook',
      }
      // Only set if at least one meaningful param is present
      const hasPrefill = prefilled.object || prefilled.note || prefilled.noteType !== 'Activity'
      if (hasPrefill) {
        setInitialData(prefilled)
      }
    }
  }, [editId, searchParams])

  const handleSubmit = (data: LogEntryFormData) => {
    addEntry(data)
  }

  if (loading) {
    return <div className="p-4 text-text-muted">Loading...</div>
  }

  return (
    <div>
      <EntryForm
        initialData={initialData}
        editId={editId}
        onSubmit={editId !== undefined ? undefined : handleSubmit}
      />
    </div>
  )
}
