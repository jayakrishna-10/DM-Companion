import { useEffect, useMemo, useState } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { PhotoCaptureSheet } from '@/components/photo/PhotoCaptureSheet'
import { HomeSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toaster'
import { Camera, CheckCircle2, CloudOff, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import type { LogEntry, PlantPhoto } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function Home() {
  const { isReady, entries, removeEntry, photos, photoTags, addPhoto, removePhoto, getOpenIssues, syncStatus } = useDatabase()
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const navigate = useNavigate()

  const sortedEntries = useMemo(() => {
    const sorted = new Map<string, LogEntry[]>()
    for (const [date, dateEntries] of entries) {
      sorted.set(date, [...dateEntries].sort((a, b) => b.id - a.id))
    }
    return sorted
  }, [entries])

  const todayKey = new Date().toISOString().split('T')[0]
  const todayEntries = sortedEntries.get(todayKey) || []
  const openIssues = isReady ? getOpenIssues().filter(issue => !issue.resolved) : []
  const pendingPhotos = photos.filter(photo => !photo.synced).length

  const handleObjectClick = (objectName: string) => {
    navigate(`/equipment?object=${encodeURIComponent(objectName)}`)
  }

  if (!isReady) return <HomeSkeleton />

  return (
    <div className="page-shell">
      <div className="content-grid space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-4/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%),linear-gradient(145deg,rgba(28,28,36,0.96),rgba(5,5,7,0.92))] p-4 shadow-2xl shadow-black/30 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label text-cyan-light">Operator dashboard</p>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-heading lg:text-5xl">Today's shift log</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">Capture field events, attach equipment photos, and keep Notion sync visible without leaving the local-first logbook.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <StatusTile label="Today" value={todayEntries.length} tone="cyan" />
              <StatusTile label="Open issues" value={openIssues.length} tone={openIssues.length > 0 ? 'rose' : 'emerald'} />
              <StatusTile label="Photos queued" value={pendingPhotos} tone={pendingPhotos > 0 ? 'amber' : 'slate'} />
              <StatusTile label="Sync" value={syncStatus} tone={syncStatus === 'error' ? 'amber' : syncStatus === 'offline' ? 'slate' : 'emerald'} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/new')}
            className="min-h-16 rounded-2xl bg-cyan p-4 font-display text-base font-black text-obsidian shadow-xl shadow-cyan-glow transition-all hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Plus size={21} strokeWidth={2.5} />
            Log Event
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setPhotoSheetOpen(true)}
            className="min-h-16 rounded-2xl border border-slate-4 bg-slate-2 p-4 font-semibold text-heading shadow-xl shadow-black/20 transition-all hover:border-cyan/30 flex items-center justify-center gap-2"
          >
            <Camera size={21} strokeWidth={2.5} />
            Capture Photo
          </motion.button>
        </div>

      {photos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-label">
              EQUIPMENT PHOTOS
            </h3>
            <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
              {photos.length}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
            {photos.slice(0, 12).map(photo => (
              <PhotoCard key={photo.id} photo={photo} onDelete={(id) => { removePhoto(id); toast('Photo deleted') }} />
            ))}
          </div>
        </section>
      )}

      {todayEntries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-label">
              TODAY
            </h3>
            <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
              {todayEntries.length}
            </span>
          </div>
          <TimelineLine>
            <AnimatePresence>
              {todayEntries.map(entry => (
                <TimelineCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => { setSelectedEntry(entry); setSheetOpen(true) }}
                  showObjectLink={true}
                  onObjectClick={handleObjectClick}
                />
              ))}
            </AnimatePresence>
          </TimelineLine>
        </section>
      )}

      {Array.from(sortedEntries.entries())
        .filter(([date]) => date !== todayKey)
        .slice(0, 7)
        .map(([date, dateEntries]) => (
          <CollapsibleGroup key={date} date={date} entries={dateEntries} onEntryClick={(e) => { setSelectedEntry(e); setSheetOpen(true) }} />
        ))
      }

      {sortedEntries.size === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-4 bg-slate-2/50 px-6 py-14 text-center">
          <p className="font-display text-xl font-black text-heading">No entries yet</p>
          <p className="mt-2 text-sm text-text-muted">Start today's shift record with a log event or equipment photo.</p>
        </div>
      )}

      <EntryDetailSheet
        entry={selectedEntry}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={(entry) => {
          setSheetOpen(false)
          navigate(`/new?edit=${entry.id}`)
        }}
        onDelete={(id) => {
          removeEntry(id)
          setSheetOpen(false)
          toast('Entry deleted')
        }}
        onDuplicate={(entry) => {
          setSheetOpen(false)
          navigate(`/new?duplicate=${entry.id}`)
        }}
      />

      <PhotoCaptureSheet
        isOpen={photoSheetOpen}
        tags={photoTags}
        onClose={() => setPhotoSheetOpen(false)}
        onSave={addPhoto}
      />
      </div>
    </div>
  )
}

function StatusTile({ label, value, tone }: { label: string; value: number | string; tone: 'cyan' | 'rose' | 'amber' | 'emerald' | 'slate' }) {
  const tones = {
    cyan: 'text-cyan-light border-cyan/20 bg-cyan/10',
    rose: 'text-rose-light border-rose/20 bg-rose/10',
    amber: 'text-amber-light border-amber/20 bg-amber/10',
    emerald: 'text-emerald-light border-emerald/20 bg-emerald/10',
    slate: 'text-text-muted border-slate-4 bg-slate-3/70',
  }
  return (
    <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <p className="font-data text-[9px] font-bold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-1 font-display text-xl font-black tabular capitalize">{value}</p>
    </div>
  )
}

function PhotoCard({ photo, onDelete }: { photo: PlantPhoto; onDelete: (id: number) => void }) {
  const url = useMemo(() => {
    const imageBuffer = photo.sdData.buffer.slice(photo.sdData.byteOffset, photo.sdData.byteOffset + photo.sdData.byteLength) as ArrayBuffer
    const blob = new Blob([imageBuffer], { type: photo.sdMimeType })
    return URL.createObjectURL(blob)
  }, [photo.sdData, photo.sdMimeType])

  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return (
    <div className="relative w-40 flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-4 bg-slate-2 shadow-lg shadow-black/20">
      <div className="aspect-square bg-obsidian">
        {url && <img src={url} alt={photo.tag} className="h-full w-full object-cover" />}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-bold text-heading" title={photo.tag}>{photo.tag}</p>
        <div className="mt-1 flex items-center justify-between font-data text-[10px] text-label">
          <span>{Math.max(1, Math.round(photo.sdSizeBytes / 1024))} KB</span>
          {photo.synced ? <CheckCircle2 size={12} className="text-emerald-400" /> : <CloudOff size={12} className="text-amber-400" />}
        </div>
      </div>
      <button aria-label={`Delete photo ${photo.tag}`} onClick={() => onDelete(photo.id)} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-neutral-300 backdrop-blur transition-colors hover:text-white">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function CollapsibleGroup({ date, entries, onEntryClick }: { date: string; entries: LogEntry[]; onEntryClick: (entry: LogEntry) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="mb-3">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center gap-2 rounded-xl py-2 text-left transition-colors hover:text-heading">
        <motion.svg animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-neutral-500 flex-shrink-0">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <span className="section-label flex-1 text-left">
          {formatDate(date)}
        </span>
        <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
          {entries.length}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <TimelineLine>
              {entries.map(entry => (
                <TimelineCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => onEntryClick(entry)}
                  showObjectLink={true}
                  onObjectClick={(objectName) => navigate(`/equipment?object=${encodeURIComponent(objectName)}`)}
                />
              ))}
            </TimelineLine>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
