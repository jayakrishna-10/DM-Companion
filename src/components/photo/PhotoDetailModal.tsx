import { useMemo, useState } from 'react'
import { CheckCircle2, CloudOff, DownloadCloud, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import type { PlantPhoto } from '@/types'
import { usePhotoUrl } from './usePhotoUrl'

interface PhotoDetailModalProps {
  photo: PlantPhoto | null
  tags: string[]
  onClose: () => void
  onDelete: (id: number) => void
  onUpdate: (id: number, photo: { tag?: string; note?: string }) => void
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB'
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function PhotoDetailModal({ photo, tags, onClose, onDelete, onUpdate }: PhotoDetailModalProps) {
  const [quality, setQuality] = useState<'sd' | 'hd'>('sd')
  const [loadingHd, setLoadingHd] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftTag, setDraftTag] = useState(photo?.tag || '')
  const [draftNote, setDraftNote] = useState(photo?.note || '')
  const url = usePhotoUrl(photo, quality)

  const suggestions = useMemo(() => {
    const query = draftTag.trim().toLowerCase()
    return tags.filter(tag => !query || tag.toLowerCase().includes(query)).slice(0, 8)
  }, [draftTag, tags])

  if (!photo) return null

  const showHd = () => {
    setLoadingHd(true)
    setQuality('hd')
    window.setTimeout(() => setLoadingHd(false), 180)
  }

  const save = () => {
    if (!draftTag.trim()) {
      toast('Photo tag is required')
      return
    }
    onUpdate(photo.id, { tag: draftTag, note: draftNote })
    setEditing(false)
    toast('Photo details saved')
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this photo from local storage?')) return
    onDelete(photo.id)
    onClose()
    toast('Photo deleted')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-900 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal-400">Photo detail</p>
            <h2 className="truncate text-lg font-semibold text-neutral-100">{photo.tag}</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-neutral-400"><X size={18} /></button>
        </div>

        <div className="relative flex min-h-[280px] flex-1 items-center justify-center bg-black">
          {url && <img src={url} alt={photo.tag} className="max-h-[62dvh] w-full object-contain" />}
          {loadingHd && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="animate-spin text-teal-300" /></div>}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {photo.hdData && quality === 'sd' && (
              <button onClick={showHd} className="rounded-full border border-teal-500/40 bg-black/70 px-3 py-1.5 text-xs font-semibold text-teal-200 backdrop-blur">
                View HD
              </button>
            )}
            {!photo.hdData && <span className="rounded-full border border-neutral-700 bg-black/70 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur"><DownloadCloud size={13} className="mr-1 inline" /> HD archived in Notion</span>}
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 sm:grid-cols-4">
            <span className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">SD {formatBytes(photo.sdSizeBytes)}</span>
            <span className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">HD {formatBytes(photo.hdSizeBytes)}</span>
            <span className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">{new Date(photo.createdAt).toLocaleDateString()}</span>
            <span className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">{photo.synced ? <CheckCircle2 size={13} className="mr-1 inline text-emerald-400" /> : <CloudOff size={13} className="mr-1 inline text-amber-400" />}{photo.synced ? 'Synced' : 'Pending'}</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Tag</label>
                <input value={draftTag} onChange={event => setDraftTag(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-neutral-100 outline-none focus:border-teal-500/70" />
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {suggestions.map(tag => <button key={tag} onClick={() => setDraftTag(tag)} className="whitespace-nowrap rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs text-teal-100">{tag}</button>)}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Note</label>
                <textarea value={draftNote} onChange={event => setDraftNote(event.target.value)} placeholder="Add details about this picture..." className="mt-2 h-24 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-teal-500/70" />
              </div>
              <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
                <div className="mb-1 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Note</span><button onClick={() => setEditing(true)} className="text-xs text-teal-300"><Pencil size={13} className="mr-1 inline" />Edit</button></div>
                <p className="whitespace-pre-wrap text-sm text-neutral-300">{photo.note || 'Add note...'}</p>
              </div>
              <Button variant="danger" onClick={handleDelete}><Trash2 size={15} /> Delete photo</Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
