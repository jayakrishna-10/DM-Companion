import { useState, useMemo } from 'react'
import type { LogEntryFormData, ObjectOption } from '@/types'
import { getNoteTypeColor } from '@/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Input, TextArea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useDatabase } from '@/hooks/useDatabase'
import { detectNoteType, detectObjects } from '@/utils/auto-tag'
import { Search, Sparkles, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from '@/components/ui/Toaster'

interface EntryFormProps {
  initialData?: LogEntryFormData
  onSubmit?: (data: LogEntryFormData) => void
  editId?: number
}

export function EntryForm({ initialData, onSubmit, editId }: EntryFormProps) {
  const { addEntry, editEntry, getHierarchy, noteTypes, sourceTags, addTag } = useDatabase()
  const isEditing = editId !== undefined
  const [noteType, setNoteType] = useState<string>(initialData?.noteType || 'Activity')
  const [note, setNote] = useState(initialData?.note || '')
  const [comment, setComment] = useState(initialData?.comment || '')
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0])
  const [object, setObject] = useState(initialData?.object || '')
  const [objectGroup, setObjectGroup] = useState(initialData?.objectGroup || '')
  const [objectType, setObjectType] = useState(initialData?.objectType || '')
  const [source, setSource] = useState(initialData?.source || 'CWTP logbook')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdowns, setShowDropdowns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [showAddObjectType, setShowAddObjectType] = useState(false)
  const [newObjectTypeName, setNewObjectTypeName] = useState('')
  const [showAddObjectGroup, setShowAddObjectGroup] = useState(false)
  const [newObjectGroupName, setNewObjectGroupName] = useState('')
  const [showAddObject, setShowAddObject] = useState(false)
  const [newObjectName, setNewObjectName] = useState('')

  const hierarchy = getHierarchy()
  const activeNoteType = noteTypes.includes(noteType) ? noteType : (noteTypes[0] || noteType)

  const typeOptions = [...hierarchy.types.map(t => ({ value: t, label: t })), { value: '__add_new__', label: '+ Add new type...' }]
  const groupOptions = objectType ? [...(hierarchy.groups[objectType] || []).map(g => ({ value: g, label: g })), { value: '__add_new__', label: '+ Add new group...' }] : []
  const objectOptions = objectGroup ? [...(hierarchy.objects[objectGroup] || []).map(o => ({ value: o.object, label: o.object })), { value: '__add_new__', label: '+ Add new object...' }] : []

  // Build source options from dynamic sourceTags + add-new option
  const sourceOptions = useMemo(() => {
    const options = sourceTags.map(s => ({ value: s, label: s }))
    options.push({ value: '__add_new__', label: '+ Add new source...' })
    return options
  }, [sourceTags])

  // Real-time auto-tag suggestions based on note text
  const suggestions = useMemo(() => {
    if (!note.trim() || note.length < 2) return { noteType: null as string | null, objects: [] as ObjectOption[] }
    const detectedType = detectNoteType(note)
    const detectedObjects = detectObjects(note, hierarchy, 3)
    return { noteType: detectedType, objects: detectedObjects }
  }, [note, hierarchy])

  // Whether the suggested noteType differs from the current one
  const showNoteTypeSuggestion = suggestions.noteType && noteTypes.includes(suggestions.noteType) && suggestions.noteType !== activeNoteType

  // Whether there are object suggestions not already selected
  const objectSuggestions = suggestions.objects.filter(s => s.object !== object)

  const handleAddSource = () => {
    const trimmed = newSourceName.trim()
    if (trimmed) {
      addTag({ name: trimmed, category: 'source' })
      setSource(trimmed)
      setNewSourceName('')
      setShowAddSource(false)
      toast('Source added', 'success')
    }
  }

  const handleObjectTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddObjectType(true)
    } else {
      setObjectType(val)
      setObjectGroup('')
      setObject('')
      setShowAddObjectType(false)
    }
  }

  const handleAddObjectType = () => {
    const trimmed = newObjectTypeName.trim()
    if (trimmed) {
      addTag({ name: trimmed, category: 'object_type' })
      setObjectType(trimmed)
      setObjectGroup('')
      setObject('')
      setNewObjectTypeName('')
      setShowAddObjectType(false)
      toast('Object type added', 'success')
    }
  }

  const handleObjectGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddObjectGroup(true)
    } else {
      setObjectGroup(val)
      setObject('')
      setShowAddObjectGroup(false)
    }
  }

  const handleAddObjectGroup = () => {
    const trimmed = newObjectGroupName.trim()
    if (trimmed && objectType) {
      addTag({ name: objectType + '|' + trimmed, category: 'object_group' })
      setObjectGroup(trimmed)
      setObject('')
      setNewObjectGroupName('')
      setShowAddObjectGroup(false)
      toast('Object group added', 'success')
    }
  }

  const handleObjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddObject(true)
    } else {
      setObject(val)
      setShowAddObject(false)
    }
  }

  const handleAddObject = () => {
    const trimmed = newObjectName.trim()
    if (trimmed && objectType && objectGroup) {
      addTag({ name: objectType + '|' + objectGroup + '|' + trimmed, category: 'object' })
      setObject(trimmed)
      setNewObjectName('')
      setShowAddObject(false)
      toast('Object added', 'success')
    }
  }

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddSource(true)
    } else {
      setSource(val)
      setShowAddSource(false)
    }
  }

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

    if (!noteTypes.includes(activeNoteType)) {
      toast('Please sync from Notion to load valid note types', 'error')
      return
    }

    setIsSubmitting(true)
    const data: LogEntryFormData = { note, comment, date, noteType: activeNoteType, object, objectGroup, objectType, source }

    if (isEditing) {
      editEntry(editId, data)
      toast('Entry tags updated', 'success')
    } else if (onSubmit) {
      onSubmit(data)
    } else {
      addEntry(data)
      toast('Entry saved', 'success')
      setNote('')
      setComment('')
      setObject('')
      setObjectGroup('')
      setObjectType('')
      setSearchQuery('')
    }

    setTimeout(() => setIsSubmitting(false), 300)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-neutral-950 min-h-screen">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Note Type</label>
        <SegmentedControl
          value={activeNoteType}
          onChange={setNoteType}
          noteTypes={noteTypes}
        />
        {/* Auto-detected note type suggestion */}
        <AnimatePresence>
          {showNoteTypeSuggestion && (
            <motion.button
              type="button"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={applyNoteTypeSuggestion}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs hover:bg-teal-500/20 transition-colors w-full text-left"
            >
              <Sparkles size={12} className="text-teal-400 shrink-0" />
              <span className="text-neutral-400">Detected:</span>
              <span
                className="font-semibold"
                style={{ color: getNoteTypeColor(suggestions.noteType!) }}
              >
                {suggestions.noteType}
              </span>
              <span className="text-neutral-400 ml-auto">tap to apply</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Equipment</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search equipment (P2-4, R5-C...)"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
          />
          {object && !searchQuery && (
            <button
              type="button"
              onClick={() => { setObject(''); setObjectGroup(''); setObjectType('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs hover:bg-teal-500/20 transition-colors"
                >
                  <Sparkles size={10} className="text-teal-400" />
                  <span className="text-teal-400 font-medium">{obj.object}</span>
                  <span className="text-neutral-400">{obj.objectGroup}</span>
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
              className="rounded-lg border border-neutral-800/50 bg-neutral-900/60 overflow-hidden"
            >
              {searchResults.map((obj, i) => (
                <button
                  key={`${obj.objectGroup}-${obj.object}-${i}`}
                  type="button"
                  onClick={() => handleObjectSelect(obj)}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-800/40 transition-colors border-b border-neutral-800/50 last:border-0"
                >
                  <span className="text-sm text-neutral-200 font-medium">{obj.object}</span>
                  <span className="text-xs text-neutral-400 ml-2">{obj.objectGroup} · {obj.objectType}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {object && !searchQuery && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <span className="text-sm text-teal-400 font-medium">{object}</span>
            <span className="text-xs text-neutral-400">{objectGroup} · {objectType}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDropdowns(!showDropdowns)}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
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
                value={showAddObjectType ? '' : objectType}
                onChange={handleObjectTypeChange}
              />
              {showAddObjectType && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 overflow-hidden"
                >
                  <input
                    type="text"
                    value={newObjectTypeName}
                    onChange={e => setNewObjectTypeName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddObjectType()
                      if (e.key === 'Escape') { setShowAddObjectType(false); setNewObjectTypeName('') }
                    }}
                    placeholder="New object type..."
                    className="flex-1 h-9 px-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddObjectType}
                    disabled={!newObjectTypeName.trim()}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-teal-500 text-white text-xs disabled:opacity-50 transition-opacity"
                  >
                    <Check size={14} />
                  </button>
                </motion.div>
              )}
              {objectType && (
                <div className="space-y-1.5">
                  <Select
                    label="Object Group"
                    options={groupOptions}
                    placeholder="Select group..."
                    value={showAddObjectGroup ? '' : objectGroup}
                    onChange={handleObjectGroupChange}
                  />
                  {showAddObjectGroup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-1.5 overflow-hidden"
                    >
                      <input
                        type="text"
                        value={newObjectGroupName}
                        onChange={e => setNewObjectGroupName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddObjectGroup()
                          if (e.key === 'Escape') { setShowAddObjectGroup(false); setNewObjectGroupName('') }
                        }}
                        placeholder="New object group..."
                        className="flex-1 h-9 px-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddObjectGroup}
                        disabled={!newObjectGroupName.trim()}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-teal-500 text-white text-xs disabled:opacity-50 transition-opacity"
                      >
                        <Check size={14} />
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
              {objectGroup && (
                <div className="space-y-1.5">
                  <Select
                    label="Object"
                    options={objectOptions}
                    placeholder="Select object..."
                    value={showAddObject ? '' : object}
                    onChange={handleObjectChange}
                  />
                  {showAddObject && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-1.5 overflow-hidden"
                    >
                      <input
                        type="text"
                        value={newObjectName}
                        onChange={e => setNewObjectName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddObject()
                          if (e.key === 'Escape') { setShowAddObject(false); setNewObjectName('') }
                        }}
                        placeholder="New object name..."
                        className="flex-1 h-9 px-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddObject}
                        disabled={!newObjectName.trim()}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-teal-500 text-white text-xs disabled:opacity-50 transition-opacity"
                      >
                        <Check size={14} />
                      </button>
                    </motion.div>
                  )}
                </div>
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
        disabled={isEditing}
        className={isEditing ? 'opacity-60 cursor-not-allowed' : ''}
      />

      <TextArea
        label={isEditing ? 'Note * (read-only after creation)' : 'Note *'}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Describe the activity, complaint, or abnormality..."
        disabled={isEditing}
        className={isEditing ? 'opacity-60 cursor-not-allowed' : ''}
      />

      <TextArea
        label="Operator Comment"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a short follow-up, handover note, or clarification..."
        rows={2}
        className="min-h-[64px] text-xs"
      />

      <div className="space-y-1.5">
        <Select
          label="Source"
          options={sourceOptions}
          value={showAddSource ? '' : source}
          onChange={handleSourceChange}
          placeholder="Select source..."
        />

        <AnimatePresence>
          {showAddSource && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 overflow-hidden"
            >
              <input
                type="text"
                value={newSourceName}
                onChange={e => setNewSourceName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSource()
                  if (e.key === 'Escape') { setShowAddSource(false); setNewSourceName('') }
                }}
                placeholder="New source name..."
                className="flex-1 h-9 px-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddSource}
                disabled={!newSourceName.trim()}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-teal-500 text-white text-xs disabled:opacity-50 transition-opacity"
              >
                <Check size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
