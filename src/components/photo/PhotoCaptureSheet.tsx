import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

const SD_TARGET_BYTES = 45 * 1024
const HD_TARGET_BYTES = 1024 * 1024

interface PhotoCaptureSheetProps {
  isOpen: boolean
  tags: string[]
  onClose: () => void
  onSave: (photos: { tag: string; sdData: Uint8Array; sdMimeType: string; hdData: Uint8Array; hdMimeType: string }[]) => void
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
  const [isSaving, setIsSaving] = useState(false)

  const quickTags = useMemo(() => tags.slice(0, 12), [tags])
  const previewUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [previewUrls])

  const handleClose = () => {
    setFiles([])
    setTag('')
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 px-4 py-6 backdrop-blur-sm sm:items-center">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-4 bg-slate-2 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-slate-4/70 px-4 py-3">
          <div>
            <p className="section-label text-cyan-light">Plant photo</p>
            <h2 className="font-display text-xl font-black text-heading">Capture equipment image</h2>
          </div>
          <button aria-label="Close photo capture" onClick={handleClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-3 text-label transition-colors hover:text-heading">
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
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-4 bg-slate-1"
          >
            {previewUrls.length > 0 ? (
              <div className="grid h-full w-full grid-cols-2 gap-1 bg-obsidian p-1">
                {previewUrls.slice(0, 4).map((url, index) => (
                  <div key={url} className="relative overflow-hidden rounded-xl bg-slate-2">
                    <img src={url} alt={`Selected plant equipment ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 3 && previewUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-neutral-100 font-semibold">+{previewUrls.length - 4}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan-light">
                  <Camera size={28} />
                </div>
                <p className="font-semibold text-heading">Take or choose photos</p>
                <p className="mt-1 text-sm text-text-muted">Select multiple photos when supported. Camera opens on mobile PWA.</p>
              </div>
            )}
          </button>

          <div>
            <label className="section-label">Base photo name / tag</label>
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="e.g. Boiler feed pump A"
              className="mt-2 h-12 w-full rounded-xl border border-slate-4 bg-slate-1 px-4 text-body placeholder:text-label/60 focus:border-cyan/60 focus:outline-none"
            />
          </div>

          {quickTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickTags.map((item) => (
                <button key={item} onClick={() => setTag(item)} className="rounded-xl border border-slate-4 bg-slate-3/70 px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:border-cyan/30 hover:text-heading">
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save {files.length > 1 ? `${files.length} photos` : 'photo'}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-4 bg-slate-1/70 p-3 text-xs leading-relaxed text-text-muted">
            <ImagePlus size={15} className="mt-0.5 text-cyan-light" />
            <p>SQLite keeps compact SD thumbnails around 45 KB for offline retrieval. Notion receives HD copies up to ~1 MB when online.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
