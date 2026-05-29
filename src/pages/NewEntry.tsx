/* eslint-disable react-hooks/set-state-in-effect */
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
    }
  }, [editId])

  const handleSubmit = (data: LogEntryFormData) => {
    addEntry(data)
  }

  if (loading) {
    return <div className="page-shell text-text-muted">Loading...</div>
  }

  return (
    <>
      <EntryForm
        initialData={initialData}
        editId={editId}
        onSubmit={editId !== undefined ? undefined : handleSubmit}
      />
    </>
  )
}
