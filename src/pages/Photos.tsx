import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Camera, CheckCircle2, CloudOff, Filter, MessageSquare, Search, SlidersHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDatabase } from '@/hooks/useDatabase'
import { Button } from '@/components/ui/Button'
import { PhotoDetailModal } from '@/components/photo/PhotoDetailModal'
import { PhotoCaptureSheet } from '@/components/photo/PhotoCaptureSheet'
import { usePhotoUrl } from '@/components/photo/usePhotoUrl'
import type { PhotoFilterOptions, PlantPhoto } from '@/types'

const syncOptions: PhotoFilterOptions['synced'][] = ['all', 'synced', 'unsynced']

export function Photos({ basePath = '/photos', compactHeader = false }: { basePath?: string; compactHeader?: boolean }) {
  const { photos, photoTags, addPhoto, updatePhoto, removePhoto, filterPhotos, refreshPhotos } = useDatabase()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [synced, setSynced] = useState<PhotoFilterOptions['synced']>('all')
  const [sort, setSort] = useState('date-desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [manualSelected, setManualSelected] = useState<PlantPhoto | null>(null)

  const [sortKey, order] = sort.split('-') as [PhotoFilterOptions['sort'], PhotoFilterOptions['order']]
  const filtered = filterPhotos({ search, tag, synced, sort: sortKey, order, limit: 500 })
  const querySelected = useMemo(() => {
    const id = Number(new URLSearchParams(location.search).get('id'))
    return id ? photos.find(photo => photo.id === id) || null : null
  }, [location.search, photos])
  const selected = manualSelected || querySelected

  useEffect(() => {
    refreshPhotos()
  }, [refreshPhotos])

  const closeModal = () => {
    setManualSelected(null)
    if (location.search) navigate(basePath, { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-24">
      <div className={`${compactHeader ? '' : 'sticky top-12 z-20 border-b border-neutral-900 bg-neutral-950/92'} px-4 py-3 backdrop-blur`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal-400">Photo library</p>
            <h1 className="text-2xl font-black tracking-tight text-neutral-100">Equipment images</h1>
            <p className="text-xs text-neutral-500">{filtered.length} shown · {photos.length} stored locally</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300"><SlidersHorizontal size={18} /></button>
            <button onClick={() => setCaptureOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20"><Camera size={18} /></button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3">
          <Search size={16} className="text-neutral-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tag or note..." className="h-11 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-600" />
        </div>

        {filtersOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setTag('')} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${!tag ? 'border-teal-500/40 bg-teal-500/15 text-teal-100' : 'border-neutral-800 text-neutral-400'}`}>All tags</button>
              {photoTags.map(item => <button key={item} onClick={() => setTag(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${tag === item ? 'border-teal-500/40 bg-teal-500/15 text-teal-100' : 'border-neutral-800 text-neutral-400'}`}>{item}</button>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {syncOptions.map(option => <button key={option} onClick={() => setSynced(option)} className={`rounded-xl border px-2 py-2 text-xs capitalize ${synced === option ? 'border-teal-500/40 bg-teal-500/15 text-teal-100' : 'border-neutral-800 text-neutral-400'}`}>{option}</button>)}
            </div>
            <select value={sort} onChange={event => setSort(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 outline-none">
              <option value="date-desc">Date newest</option>
              <option value="date-asc">Date oldest</option>
              <option value="tag-asc">Tag A-Z</option>
              <option value="tag-desc">Tag Z-A</option>
              <option value="size-desc">Size largest</option>
            </select>
          </motion.div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900 text-neutral-500"><Filter size={28} /></div>
          <p className="font-semibold text-neutral-300">No photos match these filters</p>
          <p className="mt-1 text-sm text-neutral-600">Clear filters or capture another equipment image.</p>
          <Button className="mt-5" variant="primary" onClick={() => setCaptureOpen(true)}><Camera size={16} /> Add photo</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map(photo => <PhotoTile key={photo.id} photo={photo} onClick={() => setManualSelected(photo)} />)}
        </div>
      )}

      <PhotoDetailModal key={selected?.id ?? 'empty'} photo={selected} tags={photoTags} onClose={closeModal} onDelete={removePhoto} onUpdate={updatePhoto} />
      <PhotoCaptureSheet isOpen={captureOpen} tags={photoTags} onClose={() => setCaptureOpen(false)} onSave={addPhoto} />
    </div>
  )
}

function PhotoTile({ photo, onClick }: { photo: PlantPhoto; onClick: () => void }) {
  const url = usePhotoUrl(photo, 'sd')
  return (
    <motion.button layout onClick={onClick} className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 text-left shadow-lg shadow-black/10">
      <div className="relative aspect-square bg-neutral-950">
        {url && <img src={url} alt={photo.tag} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
        <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-black ${photo.synced ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {photo.note && <span className="absolute bottom-2 right-2 rounded-full bg-black/65 p-1.5 text-teal-200 backdrop-blur"><MessageSquare size={13} /></span>}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-neutral-200">{photo.tag}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-neutral-500">{photo.synced ? <CheckCircle2 size={11} className="text-emerald-400" /> : <CloudOff size={11} className="text-amber-400" />}{new Date(photo.createdAt).toLocaleDateString()}</p>
      </div>
    </motion.button>
  )
}
