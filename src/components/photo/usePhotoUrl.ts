import { useEffect, useMemo } from 'react'
import type { PlantPhoto } from '@/types'

export function usePhotoUrl(photo: PlantPhoto | null, quality: 'sd' | 'hd' = 'sd') {
  const url = useMemo(() => {
    if (!photo) return null
    const bytes = quality === 'hd' ? photo.hdData : photo.sdData
    const mimeType = quality === 'hd' ? photo.hdMimeType : photo.sdMimeType
    if (!bytes) return null
    const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return URL.createObjectURL(new Blob([imageBuffer], { type: mimeType }))
  }, [photo, quality])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  return url
}
