import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

const SD_TARGET_BYTES = 45 * 1024
const HD_TARGET_BYTES = 1024 * 1024

interface PhotoCaptureSheetProps {
  isOpen: boolean
  tags: string[]
  onClose: () => void
  onSave: (photos: { tag: string; note?: string; sdData: Uint8Array; sdMimeType: string; hdData: Uint8Array; hdMimeType: string }[]) => void
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Unable to encode image'))
    }, 'image/jpeg', quality)
  })
}

async function compressImage(file: File, targetBytes: number, maxDimension: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  let quality = 0.82
  let best: Blob | null = null

  for (let attempt = 0; attempt < 12; attempt++) {
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, quality)
    best = blob
    if (blob.size <= targetBytes) break
    if (quality > 0.45) quality -= 0.12
    else scale *= 0.82
  }

  bitmap.close()
  if (!best) throw new Error('Unable to compress image')
  return best
}

export function PhotoCaptureSheet({ isOpen, tags, onClose, onSave }: PhotoCaptureSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [tag, setTag] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const quickTags = useMemo(() => {
    const query = tag.trim().toLowerCase()
    return tags.filter(item => !query || item.toLowerCase().includes(query)).slice(0, 12)
  }, [tag, tags])
  const previewUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])
  const canCreateTag = tag.trim() && !tags.some(item => item.toLowerCase() === tag.trim().toLowerCase())

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [previewUrls])

  const handleClose = () => {
    setFiles([])
    setTag('')
    setNote('')
    setIsSaving(false)
    onClose()
  }

  if (!isOpen) return null

  const handleSave = async () => {
    const cleanTag = tag.trim()
    if (files.length === 0) {
      toast('Take or choose photos first')
      return
    }
    if (!cleanTag) {
      toast('Add a unique name or tag')
      return
    }

    setIsSaving(true)
    try {
      const photos = await Promise.all(files.map(async (file, index) => {
        const photoName = files.length > 1 ? `${cleanTag} ${index + 1}` : cleanTag
        const [sdBlob, hdBlob] = await Promise.all([
          compressImage(file, SD_TARGET_BYTES, 520),
          compressImage(file, HD_TARGET_BYTES, 1800),
        ])
        return {
          tag: photoName,
          note: note.trim(),
          sdData: await blobToBytes(sdBlob),
          sdMimeType: sdBlob.type || 'image/jpeg',
          hdData: await blobToBytes(hdBlob),
          hdMimeType: hdBlob.type || 'image/jpeg',
        }
      }))
      onSave(photos)
      toast(navigator.onLine ? `${photos.length} photo${photos.length === 1 ? '' : 's'} saved. Notion backup queued.` : `${photos.length} photo${photos.length === 1 ? '' : 's'} saved offline. Backup will retry when online.`)
      handleClose()
    } catch (err) {
      console.error('[photo] Save failed:', err)
      toast('Photo save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm px-4 py-6 flex items-end sm:items-center justify-center">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-900">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-teal-400 font-mono">Plant photo</p>
            <h2 className="text-lg font-semibold text-neutral-100">Capture equipment image</h2>
          </div>
          <button onClick={handleClose} className="h-9 w-9 rounded-full bg-neutral-900 text-neutral-400 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />

          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[4/3] rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/70 overflow-hidden flex items-center justify-center"
          >
            {previewUrls.length > 0 ? (
              <div className="grid h-full w-full grid-cols-2 gap-1 bg-neutral-950 p-1">
                {previewUrls.slice(0, 4).map((url, index) => (
                  <div key={url} className="relative overflow-hidden rounded-xl bg-neutral-900">
                    <img src={url} alt={`Selected plant equipment ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 3 && previewUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-neutral-100 font-semibold">+{previewUrls.length - 4}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center border border-teal-500/20">
                  <Camera size={28} />
                </div>
                <p className="text-neutral-200 font-medium">Take or choose photos</p>
                <p className="text-neutral-500 text-sm mt-1">Select multiple photos when supported. Camera opens on mobile PWA.</p>
              </div>
            )}
          </button>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">Base photo name / tag</label>
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="e.g. Boiler feed pump A"
              className="mt-2 w-full h-12 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/70"
            />
          </div>

          {(quickTags.length > 0 || canCreateTag) && (
            <div className="rounded-2xl border border-teal-500/10 bg-teal-500/[0.04] p-2">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">Tag suggestions</p>
              <div className="flex flex-wrap gap-2">
              {quickTags.map((item) => (
                <button key={item} onClick={() => setTag(item)} className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-100">
                  {item}
                </button>
              ))}
              {canCreateTag && (
                <button onClick={() => setTag(tag.trim())} className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
                  <Plus size={12} className="mr-1 inline" /> Create “{tag.trim()}”
                </button>
              )}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">Note</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe what this photo shows..."
              className="mt-2 h-20 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-teal-500/70 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save {files.length > 1 ? `${files.length} photos` : 'photo'}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-500">
            <ImagePlus size={15} className="mt-0.5 text-teal-400" />
            <p>SQLite keeps compact SD thumbnails around 45 KB for offline retrieval. Notion receives HD copies up to ~1 MB when online.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
