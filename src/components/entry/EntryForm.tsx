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
  const [noteType, setNoteType] = useState<string>(initialData?.noteType || 'Activity')
  const [note, setNote] = useState(initialData?.note || '')
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
  const showNoteTypeSuggestion = suggestions.noteType && suggestions.noteType !== noteType

  // Whether there are object suggestions not already selected
  const objectSuggestions = suggestions.objects.filter(s => s.object !== object)

  const handleAddNoteType = (name: string) => {
    addTag({ name, category: 'note_type' })
    setNoteType(name)
    toast('Note type added', 'success')
  }

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
    <form onSubmit={handleSubmit} className="page-shell">
      <div className="content-grid max-w-3xl space-y-5">
      <section className="rounded-3xl border border-slate-4/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_38%),linear-gradient(145deg,rgba(28,28,36,0.94),rgba(5,5,7,0.92))] p-4 lg:p-5">
        <p className="section-label text-cyan-light">{editId !== undefined ? 'Editing saved event' : 'Command capture'}</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-heading">{editId !== undefined ? `Update entry #${editId}` : 'Log a plant event'}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">Write the event first. DM Companion will suggest type and asset tags, then save locally before sync.</p>
      </section>

      <section className="metric-card space-y-4 p-4">
        <TextArea
          label="Event note *"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe the activity, complaint, or abnormality..."
          className="min-h-[150px] text-base leading-relaxed"
        />
      </section>

      <section className="metric-card space-y-3 p-4">
        <label className="section-label">Note Type</label>
        <SegmentedControl
          value={noteType}
          onChange={setNoteType}
          noteTypes={noteTypes}
          onAddType={handleAddNoteType}
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
              className="flex w-full items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/10 px-3 py-2 text-left text-xs transition-colors hover:bg-cyan/15"
            >
              <Sparkles size={12} className="shrink-0 text-cyan-light" />
              <span className="text-text-muted">Detected:</span>
              <span
                className="font-semibold"
                style={{ color: getNoteTypeColor(suggestions.noteType!) }}
              >
                {suggestions.noteType}
              </span>
              <span className="ml-auto text-label">tap to apply</span>
            </motion.button>
          )}
        </AnimatePresence>
      </section>

      <section className="metric-card space-y-3 p-4">
        <label className="section-label">Equipment</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search equipment (P2-4, R5-C...)"
            className="w-full min-h-11 rounded-xl border border-slate-4 bg-slate-1 pl-9 pr-3 text-sm text-body placeholder:text-label/60 transition-all focus:border-cyan/50 focus:outline-none focus:shadow-[0_0_0_3px_var(--color-cyan-glow)]"
          />
          {object && !searchQuery && (
            <button
              type="button"
              onClick={() => { setObject(''); setObjectGroup(''); setObjectType('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-label hover:text-heading"
            >
              Clear
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
                  className="flex items-center gap-1 rounded-xl border border-cyan/20 bg-cyan/10 px-2.5 py-1.5 text-xs transition-colors hover:bg-cyan/15"
                >
                  <Sparkles size={10} className="text-cyan-light" />
                  <span className="font-bold text-cyan-light">{obj.object}</span>
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
              className="overflow-hidden rounded-xl border border-slate-4 bg-slate-1"
            >
              {searchResults.map((obj, i) => (
                <button
                  key={`${obj.objectGroup}-${obj.object}-${i}`}
                  type="button"
                  onClick={() => handleObjectSelect(obj)}
                  className="w-full border-b border-slate-4/60 px-3 py-2 text-left transition-colors last:border-0 hover:bg-slate-3/70"
                >
                  <span className="text-sm font-bold text-heading">{obj.object}</span>
                  <span className="ml-2 text-xs text-text-muted">{obj.objectGroup} · {obj.objectType}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {object && !searchQuery && (
          <div className="flex items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/10 px-3 py-2">
            <span className="text-sm font-bold text-cyan-light">{object}</span>
            <span className="text-xs text-text-muted">{objectGroup} · {objectType}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDropdowns(!showDropdowns)}
          className="flex items-center gap-1 text-xs font-bold text-label transition-colors hover:text-heading"
        >
          {showDropdowns ? 'Hide taxonomy builder' : 'Open taxonomy builder'}
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
                    className="flex-1 min-h-9 rounded-xl border border-slate-4 bg-slate-1 px-3 text-xs text-body placeholder:text-label/60 focus:border-cyan/50 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddObjectType}
                    disabled={!newObjectTypeName.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan text-obsidian disabled:opacity-50"
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
                        className="flex-1 min-h-9 rounded-xl border border-slate-4 bg-slate-1 px-3 text-xs text-body placeholder:text-label/60 focus:border-cyan/50 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddObjectGroup}
                        disabled={!newObjectGroupName.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan text-obsidian disabled:opacity-50"
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
                        className="flex-1 min-h-9 rounded-xl border border-slate-4 bg-slate-1 px-3 text-xs text-body placeholder:text-label/60 focus:border-cyan/50 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddObject}
                        disabled={!newObjectName.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan text-obsidian disabled:opacity-50"
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
      </section>

      <section className="metric-card grid gap-4 p-4 sm:grid-cols-2">
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
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
                className="flex-1 min-h-9 rounded-xl border border-slate-4 bg-slate-1 px-3 text-xs text-body placeholder:text-label/60 focus:border-cyan/50 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddSource}
                disabled={!newSourceName.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan text-obsidian disabled:opacity-50"
              >
                <Check size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </section>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !note.trim()}
      >
        {isSubmitting ? 'Saving...' : 'Save Entry'}
      </Button>
      </div>
    </form>
  )
}
