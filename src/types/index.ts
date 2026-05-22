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

export type NoteType = 'Activity' | 'Complaints' | 'Abnormality' | 'Resolved Complaint'

export const NOTE_TYPES: NoteType[] = ['Activity', 'Complaints', 'Abnormality', 'Resolved Complaint']

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  'Activity': '#3B82F6',
  'Complaints': '#EF4444',
  'Abnormality': '#F97316',
  'Resolved Complaint': '#22C55E',
}

export const NOTE_TYPE_BG: Record<NoteType, string> = {
  'Activity': 'rgba(59, 130, 246, 0.15)',
  'Complaints': 'rgba(239, 68, 68, 0.15)',
  'Abnormality': 'rgba(249, 115, 22, 0.15)',
  'Resolved Complaint': 'rgba(34, 197, 94, 0.15)',
}

export const NOTE_TYPE_GRADIENT: Record<NoteType, string> = {
  'Activity': 'linear-gradient(135deg, #60A5FA, #3B82F6)',
  'Complaints': 'linear-gradient(135deg, #F87171, #EF4444)',
  'Abnormality': 'linear-gradient(135deg, #FB923C, #F97316)',
  'Resolved Complaint': 'linear-gradient(135deg, #4ADE80, #22C55E)',
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