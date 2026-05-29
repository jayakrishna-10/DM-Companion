import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'
import { Pencil, Trash2, ExternalLink, Copy } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'

interface EntryDetailSheetProps {
  entry: LogEntry | null
  isOpen: boolean
  onClose: () => void
  onEdit: (entry: LogEntry) => void
  onDelete: (id: number) => void
  onDuplicate: (entry: LogEntry) => void
}

export function EntryDetailSheet({ entry, isOpen, onClose, onEdit, onDelete, onDuplicate }: EntryDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

  if (!entry) return null

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    onDelete(entry.id)
    onClose()
  }

  const handleObjectClick = () => {
    if (entry.object) {
      onClose()
      navigate(`/equipment?object=${encodeURIComponent(entry.object)}`)
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Entry Details">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg border px-2 py-1 text-xs font-extrabold"
            style={{ color: getNoteTypeColor(entry.noteType), backgroundColor: `${getNoteTypeColor(entry.noteType)}18`, borderColor: `${getNoteTypeColor(entry.noteType)}33` }}
          >
            {entry.noteType}
          </span>
          <span className="ml-auto font-data text-[11px] font-bold text-label">
            {entry.date}
          </span>
        </div>

        <p className="rounded-2xl border border-slate-4/70 bg-slate-1/80 p-3 text-sm leading-relaxed text-body">{entry.note}</p>

        <div className="space-y-2 rounded-2xl border border-slate-4/70 bg-slate-1/50 p-3">
          {[
            { label: 'Object', value: entry.object, clickable: !!entry.object },
            { label: 'Group', value: entry.objectGroup },
            { label: 'Type', value: entry.objectType },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="flex justify-between gap-4 text-xs">
              <span className="font-data font-bold uppercase tracking-[0.12em] text-label">{f.label}</span>
              {f.clickable ? (
                <button
                  onClick={handleObjectClick}
                  className="font-bold text-cyan-light transition-colors hover:text-cyan"
                >
                  {f.value}
                </button>
              ) : (
                <span className="font-semibold text-heading">{f.value}</span>
              )}
            </div>
          ))}
        </div>

        {entry.notionPageId && (
          <a
            href={`https://notion.so/${entry.notionPageId.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-cyan-light hover:text-cyan"
          >
            <ExternalLink size={12} />
            View in Notion
          </a>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => { onEdit(entry); onClose() }}
          >
            <Pencil size={14} /> Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => { onDuplicate(entry); onClose() }}
          >
            <Copy size={14} /> Duplicate
          </Button>
          <Button
            variant={confirmDelete ? 'danger' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={handleDelete}
          >
            <Trash2 size={14} /> {confirmDelete ? 'Confirm?' : 'Delete'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
