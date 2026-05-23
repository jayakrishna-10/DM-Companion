import { useState, useMemo } from 'react'
import type { NoteType, LogEntryFormData, ObjectOption } from '@/types'
import { NOTE_TYPE_COLORS } from '@/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Input, TextArea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useDatabase } from '@/hooks/useDatabase'
import { detectNoteType, detectObjects } from '@/utils/auto-tag'
import { Search, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from '@/components/ui/Toaster'

interface EntryFormProps {
  initialData?: LogEntryFormData
  onSubmit?: (data: LogEntryFormData) => void
  editId?: number
}

export function EntryForm({ initialData, onSubmit, editId }: EntryFormProps) {
  const { addEntry, editEntry, getHierarchy } = useDatabase()
  const [noteType, setNoteType] = useState<NoteType>(initialData?.noteType || 'Activity')
  const [note, setNote] = useState(initialData?.note || '')
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0])
  const [object, setObject] = useState(initialData?.object || '')
  const [objectGroup, setObjectGroup] = useState(initialData?.objectGroup || '')
  const [objectType, setObjectType] = useState(initialData?.objectType || '')
  const [source, setSource] = useState(initialData?.source || 'CWTP logbook')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdowns, setShowDropdowns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hierarchy = getHierarchy()

  const typeOptions = hierarchy.types.map(t => ({ value: t, label: t }))
  const groupOptions = objectType ? (hierarchy.groups[objectType] || []).map(g => ({ value: g, label: g })) : []
  const objectOptions = objectGroup ? (hierarchy.objects[objectGroup] || []).map(o => ({ value: o.object, label: o.object })) : []

  // Real-time auto-tag suggestions based on note text
  const suggestions = useMemo(() => {
    if (!note.trim() || note.length < 2) return { noteType: null as NoteType | null, objects: [] as ObjectOption[] }
    const detectedType = detectNoteType(note)
    const detectedObjects = detectObjects(note, hierarchy, 2)
    return { noteType: detectedType, objects: detectedObjects }
  }, [note, hierarchy])

  // Whether the suggested noteType differs from the current one
  const showNoteTypeSuggestion = suggestions.noteType && suggestions.noteType !== noteType

  // Whether there are object suggestions not already selected
  const objectSuggestions = suggestions.objects.filter(s => s.object !== object)

  const handleObjectSelect = (obj: { object: string; objectGroup: string; objectType: string }) => {
    setObject(obj.object)
    setObjectGroup(obj.objectGroup)
    setObjectType(obj.objectType)
    setSearchQuery('')
  }

  const applyNoteTypeSuggestion = () => {
    if (suggestions.noteType) {
      setNoteType(suggestions.noteType)
    }
  }

  const applyObjectSuggestion = (obj: ObjectOption) => {
    setObject(obj.object)
    setObjectGroup(obj.objectGroup)
    setObjectType(obj.objectType)
  }

  const searchResults = (() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const allObjects: { object: string; objectGroup: string; objectType: string }[] = []
    for (const group of Object.values(hierarchy.objects)) {
      for (const obj of group) {
        if (obj.object.toLowerCase().includes(q) || obj.objectGroup.toLowerCase().includes(q)) {
          allObjects.push(obj)
        }
      }
    }
    return allObjects.slice(0, 8)
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      toast('Please enter a note', 'error')
      return
    }

    setIsSubmitting(true)
    const data: LogEntryFormData = { note, date, noteType, object, objectGroup, objectType, source }

    if (editId !== undefined) {
      editEntry(editId, data)
      toast('Entry updated', 'success')
    } else if (onSubmit) {
      onSubmit(data)
    } else {
      addEntry(data)
      toast('Entry saved', 'success')
      setNote('')
      setObject('')
      setObjectGroup('')
      setObjectType('')
      setSearchQuery('')
    }

    setTimeout(() => setIsSubmitting(false), 300)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Note Type</label>
        <SegmentedControl value={noteType} onChange={setNoteType} />
        {/* Auto-detected note type suggestion */}
        <AnimatePresence>
          {showNoteTypeSuggestion && (
            <motion.button
              type="button"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={applyNoteTypeSuggestion}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs hover:bg-accent/20 transition-colors w-full text-left"
            >
              <Sparkles size={12} className="text-accent shrink-0" />
              <span className="text-text-muted">Detected:</span>
              <span
                className="font-semibold"
                style={{ color: NOTE_TYPE_COLORS[suggestions.noteType!] }}
              >
                {suggestions.noteType}
              </span>
              <span className="text-text-muted ml-auto">tap to apply</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Equipment</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search equipment (P2-4, R5-C...)"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
          />
          {object && !searchQuery && (
            <button
              type="button"
              onClick={() => { setObject(''); setObjectGroup(''); setObjectType('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Auto-detected equipment suggestions */}
        <AnimatePresence>
          {objectSuggestions.length > 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5"
            >
              {objectSuggestions.map((obj) => (
                <button
                  key={obj.object}
                  type="button"
                  onClick={() => applyObjectSuggestion(obj)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs hover:bg-accent/20 transition-colors"
                >
                  <Sparkles size={10} className="text-accent" />
                  <span className="text-accent-light font-medium">{obj.object}</span>
                  <span className="text-text-muted">{obj.objectGroup}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {searchQuery && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-border-subtle bg-surface overflow-hidden"
            >
              {searchResults.map((obj, i) => (
                <button
                  key={`${obj.objectGroup}-${obj.object}-${i}`}
                  type="button"
                  onClick={() => handleObjectSelect(obj)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors border-b border-border-subtle last:border-0"
                >
                  <span className="text-sm text-text-primary font-medium">{obj.object}</span>
                  <span className="text-xs text-text-muted ml-2">{obj.objectGroup} · {obj.objectType}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {object && !searchQuery && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <span className="text-sm text-accent-light font-medium">{object}</span>
            <span className="text-xs text-text-muted">{objectGroup} · {objectType}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDropdowns(!showDropdowns)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {showDropdowns ? '▼' : '►'} Or select by category
        </button>

        <AnimatePresence>
          {showDropdowns && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <Select
                label="Object Type"
                options={typeOptions}
                placeholder="Select type..."
                value={objectType}
                onChange={e => { setObjectType(e.target.value); setObjectGroup(''); setObject('') }}
              />
              {objectType && (
                <Select
                  label="Object Group"
                  options={groupOptions}
                  placeholder="Select group..."
                  value={objectGroup}
                  onChange={e => { setObjectGroup(e.target.value); setObject('') }}
                />
              )}
              {objectGroup && (
                <Select
                  label="Object"
                  options={objectOptions}
                  placeholder="Select object..."
                  value={object}
                  onChange={e => setObject(e.target.value)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      <TextArea
        label="Note *"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Describe the activity, complaint, or abnormality..."
      />

      <Select
        label="Source"
        options={[
          { value: 'CWTP logbook', label: 'CWTP logbook' },
          { value: 'DM Reports WA group', label: 'DM Reports WA group' },
        ]}
        value={source}
        onChange={e => setSource(e.target.value)}
        placeholder="Select source..."
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !note.trim()}
      >
        {isSubmitting ? 'Saving...' : 'Save Entry'}
      </Button>
    </form>
  )
}