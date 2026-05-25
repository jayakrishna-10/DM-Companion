import type { LogEntry } from '@/types'
import { Badge } from '@/components/ui/Badge'
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
        <div className="flex items-start gap-2">
          <Badge type={entry.noteType} size="md" />
        </div>

        <p className="text-base text-text-primary leading-relaxed">{entry.note}</p>

        <div className="space-y-2 py-3 border-t border-border-subtle">
          {[
            { label: 'Object', value: entry.object, clickable: !!entry.object },
            { label: 'Group', value: entry.objectGroup },
            { label: 'Type', value: entry.objectType },
            { label: 'Date', value: entry.date },
            { label: 'Source', value: entry.source },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="flex justify-between text-sm">
              <span className="text-text-muted">{f.label}</span>
              {f.clickable ? (
                <button
                  onClick={handleObjectClick}
                  className="text-accent-light hover:text-accent font-medium transition-colors"
                >
                  {f.value}
                </button>
              ) : (
                <span className="text-text-primary font-medium">{f.value}</span>
              )}
            </div>
          ))}
        </div>

        {entry.notionPageId && (
          <a
            href={`https://notion.so/${entry.notionPageId.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light"
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
