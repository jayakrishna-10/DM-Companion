import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'
import { Pencil, ExternalLink, Copy } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { CommentThread } from '@/components/entry/CommentThread'

interface EntryDetailSheetProps {
  entry: LogEntry | null
  isOpen: boolean
  onClose: () => void
  onEdit: (entry: LogEntry) => void
  onDelete: (id: number) => void
  onDuplicate: (entry: LogEntry) => void
}

export function EntryDetailSheet({ entry, isOpen, onClose, onEdit, onDuplicate }: EntryDetailSheetProps) {
  const navigate = useNavigate()

  if (!entry) return null

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
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-neutral-800 bg-neutral-800/80"
            style={{ color: getNoteTypeColor(entry.noteType) }}
          >
            {entry.noteType}
          </span>
          <span className="text-[10px] font-mono text-neutral-500 ml-auto">
            {entry.date}
          </span>
        </div>

        <p className="text-[13px] text-neutral-200 leading-relaxed">{entry.note}</p>

        <CommentThread comment={entry.comment} />

        <div className="space-y-2 py-3 border-t border-neutral-800/50">
          {[
            { label: 'Object', value: entry.object, clickable: !!entry.object },
            { label: 'Group', value: entry.objectGroup },
            { label: 'Type', value: entry.objectType },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="flex justify-between text-[11px]">
              <span className="text-neutral-500">{f.label}</span>
              {f.clickable ? (
                <button
                  onClick={handleObjectClick}
                  className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  {f.value}
                </button>
              ) : (
                <span className="text-neutral-200 font-medium">{f.value}</span>
              )}
            </div>
          ))}
        </div>

        {entry.notionPageId && (
          <a
            href={`https://notion.so/${entry.notionPageId.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-teal-400 hover:text-teal-300"
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
        </div>
      </div>
    </Sheet>
  )
}
