export interface LogEntry {
  id: number
  note: string
  date: string
  noteType: NoteType
  object: string
  objectGroup: string
  objectType: string
  source: string
  notionPageId: string | null
  createdAt: string
  updatedAt: string
  synced: number
}

export type NoteType = string

/** Default note types — used as fallback / seed data */
export const DEFAULT_NOTE_TYPES: NoteType[] = ['Activity', 'Complaints', 'Abnormality', 'Resolved Complaint']

/** Known colors for built-in note types; unknown types get a generated color */
const KNOWN_COLORS: Record<string, string> = {
  'Activity': '#3B82F6',
  'Complaints': '#EF4444',
  'Abnormality': '#F97316',
  'Resolved Complaint': '#22C55E',
}

/** Generate a consistent color for any tag name */
export function getNoteTypeColor(type: string): string {
  if (KNOWN_COLORS[type]) return KNOWN_COLORS[type]
  // Deterministic hash-based color for unknown types
  let hash = 0
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 65%, 55%)`
}

export function getNoteTypeBg(type: string): string {
  const color = getNoteTypeColor(type)
  // For known colors, return precise rgba; for hsl colors, use opacity trick
  if (KNOWN_COLORS[type]) {
    const hex = KNOWN_COLORS[type]
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, 0.15)`
  }
  return `hsla(${getNoteTypeColor(type).match(/\d+/)?.[0] || 0}, 65%, 55%, 0.15)`
}

/** @deprecated Use getNoteTypeColor() instead */
export const NOTE_TYPE_COLORS = new Proxy({} as Record<string, string>, {
  get: (_, key: string) => getNoteTypeColor(key),
})

/** @deprecated Use getNoteTypeBg() instead */
export const NOTE_TYPE_BG = new Proxy({} as Record<string, string>, {
  get: (_, key: string) => getNoteTypeBg(key),
})

/** @deprecated Use DEFAULT_NOTE_TYPES or getNoteTypes() from database */
export const NOTE_TYPES = DEFAULT_NOTE_TYPES

export const NOTE_TYPE_GRADIENT: Record<string, string> = {
  'Activity': 'linear-gradient(135deg, #60A5FA, #3B82F6)',
  'Complaints': 'linear-gradient(135deg, #F87171, #EF4444)',
  'Abnormality': 'linear-gradient(135deg, #FB923C, #F97316)',
  'Resolved Complaint': 'linear-gradient(135deg, #4ADE80, #22C55E)',
}

export interface Tag {
  id: number
  name: string
  category: 'note_type' | 'source'
  color: string
  sortOrder: number
}

export interface LogEntryFormData {
  note: string
  date: string
  noteType: NoteType
  object: string
  objectGroup: string
  objectType: string
  source: string
}

export interface ObjectOption {
  object: string
  objectGroup: string
  objectType: string
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
}

export interface NotionProperty {
  name: string
  type: string
  options?: { name: string; color?: string }[]
}

export interface ObjectHierarchy {
  types: string[]
  groups: Record<string, string[]>
  objects: Record<string, ObjectOption[]>
}

export interface OpenIssue {
  entry: LogEntry
  resolved: boolean
}