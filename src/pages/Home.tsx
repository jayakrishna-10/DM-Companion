import { useMemo, useState } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { PhotoCaptureSheet } from '@/components/photo/PhotoCaptureSheet'
import { HomeSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toaster'
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, CloudOff, Image as ImageIcon, ListChecks, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import { usePhotoUrl } from '@/components/photo/usePhotoUrl'
import type { LogEntry, OpenIssue, PlantPhoto } from '@/types'

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
  const { isReady, entries, removeEntry, photos, photoTags, addPhoto, getOpenIssues } = useDatabase()
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
  const olderGroups = Array.from(sortedEntries.entries()).filter(([date]) => date !== todayKey)
  const visibleOlderGroups = olderGroups.slice(0, 7)
  const entryRevision = useMemo(() => Array.from(entries.values()).reduce((total, dateEntries) => total + dateEntries.length, 0), [entries])

  const openIssues = useMemo(() => {
    void entryRevision
    return getOpenIssues().filter(issue => !issue.resolved)
  }, [getOpenIssues, entryRevision])
  const recentEquipmentTags = useMemo(() => {
    const seen = new Set<string>()
    const tags: string[] = []
    for (const dateEntries of sortedEntries.values()) {
      for (const entry of dateEntries) {
        const tag = entry.object.trim()
        if (!tag || seen.has(tag.toLowerCase())) continue
        seen.add(tag.toLowerCase())
        tags.push(tag)
        if (tags.length >= 24) return tags
      }
    }
    return tags
  }, [sortedEntries])
  const photoCaptureTags = useMemo(() => {
    const seen = new Set<string>()
    return [...photoTags, ...recentEquipmentTags].filter(tag => {
      const key = tag.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [photoTags, recentEquipmentTags])

  const handleObjectClick = (objectName: string) => {
    navigate(`/equipment?object=${encodeURIComponent(objectName)}`)
  }

  if (!isReady) return <HomeSkeleton />

  return (
    <div className="pb-4 bg-neutral-950 min-h-screen">
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/new')}
            className="gradient-cta col-span-2 rounded-xl p-4 flex items-center justify-center gap-2 text-white font-semibold shadow-lg shadow-teal-500/10"
          >
            <Plus size={21} strokeWidth={2.5} />
            Add Log
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/multi')}
            className="rounded-xl p-4 flex items-center justify-center gap-2 text-neutral-100 font-semibold border border-neutral-800 bg-neutral-900 shadow-lg shadow-black/20"
          >
            <ListChecks size={21} strokeWidth={2.5} />
            Paste List
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setPhotoSheetOpen(true)}
            className="rounded-xl p-4 flex items-center justify-center gap-2 text-neutral-100 font-semibold border border-neutral-800 bg-neutral-900 shadow-lg shadow-black/20"
          >
            <Camera size={21} strokeWidth={2.5} />
            Take Photo
          </motion.button>
        </div>
      </div>

      {openIssues.length > 0 && (
        <section className="px-4 mb-5">
          <button onClick={() => navigate('/issues')} className="mb-2 flex w-full items-center justify-between text-left">
            <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
              OPEN ISSUES
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300">
              {openIssues.length} active <ArrowRight size={11} />
            </span>
          </button>
          <div className="space-y-2">
            {openIssues.slice(0, 3).map(issue => (
              <IssuePreviewCard key={issue.entry.id} issue={issue} />
            ))}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="px-4 mb-5">
          <button onClick={() => navigate('/photos')} className="mb-2 flex w-full items-center justify-between text-left">
            <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
              EQUIPMENT PHOTOS
            </h3>
            <span className="text-[10px] font-medium text-teal-400">
              View all · {photos.length}
            </span>
          </button>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
            {photos.slice(0, 12).map(photo => (
              <PhotoCard key={photo.id} photo={photo} onClick={() => navigate(`/photos?id=${photo.id}`)} />
            ))}
          </div>
        </section>
      )}

      {todayEntries.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
              TODAY
            </h3>
            <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
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
                  hideDate={true}
                  showSource={true}
                  showSyncState={true}
                />
              ))}
            </AnimatePresence>
          </TimelineLine>
        </div>
      )}

      {visibleOlderGroups
        .map(([date, dateEntries]) => (
          <CollapsibleGroup key={date} date={date} entries={dateEntries} onEntryClick={(e) => { setSelectedEntry(e); setSheetOpen(true) }} />
        ))
      }

      {olderGroups.length > 0 && (
        <div className="px-4 mt-2 mb-5">
          <button
            onClick={() => navigate('/history')}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900 flex items-center justify-center gap-2"
          >
            View full history
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {sortedEntries.size === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-neutral-500 text-base">No entries yet</p>
          <p className="text-neutral-600 text-sm mt-1">Tap the button above to add your first log entry</p>
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
        tags={photoCaptureTags}
        onClose={() => setPhotoSheetOpen(false)}
        onSave={addPhoto}
      />
    </div>
  )
}

function IssuePreviewCard({ issue }: { issue: OpenIssue }) {
  const navigate = useNavigate()
  const entry = issue.entry
  const issueColor = entry.noteType === 'Complaints' ? 'text-red-300 bg-red-500/10 border-red-500/20' : 'text-orange-300 bg-orange-500/10 border-orange-500/20'

  const logResolution = () => {
    const params = new URLSearchParams({
      noteType: 'Resolved Complaint',
      object: entry.object,
      objectGroup: entry.objectGroup,
      objectType: entry.objectType,
      source: entry.source || 'CWTP logbook',
    })
    navigate(`/new?${params.toString()}`)
  }

  return (
    <article className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className={entry.noteType === 'Complaints' ? 'text-red-400 mt-0.5' : 'text-orange-400 mt-0.5'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${issueColor}`}>{entry.noteType}</span>
            <span className="font-mono text-[10px] text-neutral-500">{formatDate(entry.date)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-neutral-200">{entry.note}</p>
          {entry.object && <p className="mt-1 text-[10px] text-teal-400">{entry.object}</p>}
        </div>
        <button
          onClick={logResolution}
          className="shrink-0 rounded-lg border border-teal-500/20 bg-teal-500/10 px-2 py-1.5 text-[10px] font-semibold text-teal-300 transition-colors hover:bg-teal-500/15"
        >
          Resolve
        </button>
      </div>
    </article>
  )
}

function formatPhotoTime(value: string): string {
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return 'Captured'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Captured'
  }
}

function PhotoCard({ photo, onClick }: { photo: PlantPhoto; onClick: () => void }) {
  const url = usePhotoUrl(photo, 'sd')
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <button onClick={onClick} className="relative w-36 flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 text-left">
      <div className="aspect-square bg-neutral-950">
        {url && !imageFailed ? (
          <img src={url} alt={photo.tag} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-600">
            <ImageIcon size={26} />
            <span className="text-[10px]">Preview unavailable</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-neutral-200 truncate" title={photo.tag}>{photo.tag}</p>
        <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
          <span>{formatPhotoTime(photo.createdAt)}</span>
          {photo.synced ? <CheckCircle2 size={12} className="text-emerald-400" /> : <CloudOff size={12} className="text-amber-400" />}
        </div>
      </div>
    </button>
  )
}

function CollapsibleGroup({ date, entries, onEntryClick }: { date: string; entries: LogEntry[]; onEntryClick: (entry: LogEntry) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="px-4 mb-3">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 py-2">
        <motion.svg animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-neutral-500 flex-shrink-0">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono flex-1 text-left">
          {formatDate(date)}
        </span>
        <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
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
                  hideDate={true}
                  showSource={true}
                  showSyncState={true}
                />
              ))}
            </TimelineLine>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
