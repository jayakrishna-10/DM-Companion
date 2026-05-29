import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

const SD_TARGET_BYTES = 100 * 1024
const HD_TARGET_BYTES = 1024 * 1024

interface PhotoCaptureSheetProps {
  isOpen: boolean
  tags: string[]
  onClose: () => void
  onSave: (photo: { tag: string; sdData: Uint8Array; sdMimeType: string; hdData: Uint8Array; hdMimeType: string }) => void
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
  const [file, setFile] = useState<File | null>(null)
  const [tag, setTag] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const quickTags = useMemo(() => tags.slice(0, 12), [tags])
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleClose = () => {
    setFile(null)
    setTag('')
    setIsSaving(false)
    onClose()
  }

  if (!isOpen) return null

  const handleSave = async () => {
    const cleanTag = tag.trim()
    if (!file) {
      toast('Take or choose a photo first')
      return
    }
    if (!cleanTag) {
      toast('Add a unique name or tag')
      return
    }

    setIsSaving(true)
    try {
      const [sdBlob, hdBlob] = await Promise.all([
        compressImage(file, SD_TARGET_BYTES, 640),
        compressImage(file, HD_TARGET_BYTES, 1800),
      ])
      onSave({
        tag: cleanTag,
        sdData: await blobToBytes(sdBlob),
        sdMimeType: sdBlob.type || 'image/jpeg',
        hdData: await blobToBytes(hdBlob),
        hdMimeType: hdBlob.type || 'image/jpeg',
      })
      toast(navigator.onLine ? 'Photo saved. Notion backup queued.' : 'Photo saved offline. Backup will retry when online.')
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
            capture="environment"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[4/3] rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/70 overflow-hidden flex items-center justify-center"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected plant equipment" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center px-6">
                <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center border border-teal-500/20">
                  <Camera size={28} />
                </div>
                <p className="text-neutral-200 font-medium">Take a photo</p>
                <p className="text-neutral-500 text-sm mt-1">Camera opens on mobile PWA; gallery fallback on desktop.</p>
              </div>
            )}
          </button>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">Unique name / tag</label>
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="e.g. Boiler feed pump A"
              className="mt-2 w-full h-12 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/70"
            />
          </div>

          {quickTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickTags.map((item) => (
                <button key={item} onClick={() => setTag(item)} className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save photo
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-500">
            <ImagePlus size={15} className="mt-0.5 text-teal-400" />
            <p>SQLite keeps an SD copy under ~100 KB for offline retrieval. Notion receives an HD copy up to ~1 MB when online.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
