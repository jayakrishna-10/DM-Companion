import { EntryForm } from '@/components/entry/EntryForm'
import type { LogEntryFormData } from '@/types'
import { useDatabase } from '@/hooks/useDatabase'

export function NewEntry() {
  const { addEntry } = useDatabase()

  const handleSubmit = (data: LogEntryFormData) => {
    addEntry(data)
  }

  return (
    <div>
      <EntryForm onSubmit={handleSubmit} />
    </div>
  )
}