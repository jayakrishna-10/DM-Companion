import { useState, useMemo } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { parseMultiInput, autoTagEntries, detectNoteType, detectObjects } from '@/utils/auto-tag'
import type { LogEntryFormData, ObjectOption, ObjectHierarchy } from '@/types'
import { getNoteTypeColor } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { ClipboardList, Sparkles, ChevronDown, ChevronUp, Pencil, Check, X, ListChecks, ArrowLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface ParsedEntry extends LogEntryFormData {
  id: number
}

type Step = 'input' | 'review'

export function MultiInput() {
  const { addEntry, getHierarchy, noteTypes, sourceTags, addTag } = useDatabase()
  const [step, setStep] = useState<Step>('input')
  const [rawText, setRawText] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState('CWTP logbook')
  const [entries, setEntries] = useState<ParsedEntry[]>([])
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')

  const hierarchy = getHierarchy()

  const sourceOptions = useMemo(() => {
    const options = sourceTags.map(s => ({ value: s, label: s }))
    options.push({ value: '__add_new__', label: '+ Add new source...' })
    return options
  }, [sourceTags])

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddSource(true)
    } else {
      setSource(val)
      setShowAddSource(false)
    }
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

  const handleParse = () => {
    const lines = parseMultiInput(rawText)
    if (lines.length === 0) {
      toast('No entries found. Paste your list and try again.', 'error')
      return
    }

    const tagged = autoTagEntries(lines, date, source, hierarchy)
    const withIds = tagged.map((entry, i) => ({ ...entry, id: i }))
    setEntries(withIds)
    setStep('review')
  }

  const updateEntry = (id: number, updates: Partial<ParsedEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const removeEntry = (id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleSubmitAll = () => {
    if (entries.length === 0) {
      toast('No entries to submit', 'error')
      return
    }

    let count = 0
    for (const entry of entries) {
      if (!entry.note.trim()) continue
      addEntry({
        note: entry.note,
        date: entry.date,
        noteType: entry.noteType,
        object: entry.object,
        objectGroup: entry.objectGroup,
        objectType: entry.objectType,
        source: entry.source,
      })
      count++
    }

    toast(`${count} entries saved`, 'success')
    setEntries([])
    setRawText('')
    setStep('input')
  }

  // Input step
  if (step === 'input') {
    return (
      <div className="p-4 space-y-4 pb-24 bg-neutral-950 min-h-screen">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={20} className="text-teal-400" />
          <h2 className="text-lg font-bold text-neutral-200">Multi Entry</h2>
        </div>

        <p className="text-xs text-neutral-400">
          Paste a list of observations, activities, or complaints. Each line becomes a separate entry. Auto-tagging will suggest equipment and note types.
        </p>

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

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Paste your list
          </label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`• R5C resin removed\n• P2-4 discharge valves are closed\n• HCl tanker unloaded\n• NRV is not working for P4-4\n1) P8B pump servicing going\n2) R7-C framework going`}
            className="w-full px-3 py-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none min-h-[200px]"
            rows={8}
          />
          <p className="text-[10px] text-neutral-400">
            Supports bullet points (â€¢, -, *), numbered items (1., 2.), or plain newlines
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleParse}
          disabled={!rawText.trim()}
        >
          <Sparkles size={18} />
          Parse & Auto-Tag
        </Button>
      </div>
    )
  }

  // Review step
  return (
    <div className="p-4 space-y-3 pb-24 bg-neutral-950 min-h-screen">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setStep('input')}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{entries.length} entries</span>
          <Button variant="primary" size="sm" onClick={handleSubmitAll}>
            <ListChecks size={14} />
            Submit All
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              noteTypes={noteTypes}
              sourceTags={sourceTags}
              addTag={addTag}
              onUpdate={(updates) => updateEntry(entry.id, updates)}
              onRemove={() => removeEntry(entry.id)}
              hierarchy={hierarchy}
            />
          ))}
        </AnimatePresence>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-sm">
          No entries. Go back and paste your list.
        </div>
      )}

      <div className="sticky bottom-20 left-0 right-0 z-20 pt-3">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleSubmitAll}
          disabled={entries.length === 0}
        >
          <ListChecks size={18} />
          Submit {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
        </Button>
      </div>
    </div>
  )
}

// --- Entry Card Component ---

interface EntryCardProps {
  entry: ParsedEntry
  noteTypes: string[]
  sourceTags: string[]
  addTag: (tag: { name: string; category: 'note_type' | 'source' | 'object_type' | 'object_group' | 'object'; color?: string }) => void
  onUpdate: (updates: Partial<ParsedEntry>) => void
  onRemove: () => void
  hierarchy: ObjectHierarchy
}

function EntryCard({ entry, noteTypes, sourceTags, addTag, onUpdate, onRemove, hierarchy }: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localNote, setLocalNote] = useState(entry.note)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdowns, setShowDropdowns] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [showAddObjectType, setShowAddObjectType] = useState(false)
  const [newObjectTypeName, setNewObjectTypeName] = useState('')
  const [showAddObjectGroup, setShowAddObjectGroup] = useState(false)
  const [newObjectGroupName, setNewObjectGroupName] = useState('')
  const [showAddObject, setShowAddObject] = useState(false)
  const [newObjectName, setNewObjectName] = useState('')

  const typeOptions = useMemo(() => {
    const options = hierarchy.types.map(t => ({ value: t, label: t }))
    options.push({ value: '__add_new__', label: '+ Add new type...' })
    return options
  }, [hierarchy.types])

  const groupOptions = useMemo(() => {
    if (!entry.objectType) return []
    const options = (hierarchy.groups[entry.objectType] || []).map(g => ({ value: g, label: g }))
    options.push({ value: '__add_new__', label: '+ Add new group...' })
    return options
  }, [entry.objectType, hierarchy.groups])
  const objectOptions = entry.objectGroup
    ? [...(hierarchy.objects[entry.objectGroup] || []).map(o => ({ value: o.object, label: o.object })), { value: '__add_new__', label: '+ Add new object...' }]
    : []

  const sourceOptions = useMemo(() => {
    const options = sourceTags.map(s => ({ value: s, label: s }))
    options.push({ value: '__add_new__', label: '+ Add new source...' })
    return options
  }, [sourceTags])

  // Real-time auto-tag suggestions when editing
  const suggestions = useMemo(() => {
    if (!localNote.trim() || localNote.length < 2) return { noteType: null as string | null, objects: [] as ObjectOption[] }
    const detectedType = detectNoteType(localNote)
    const detectedObjects = detectObjects(localNote, hierarchy, 3)
    return { noteType: detectedType, objects: detectedObjects }
  }, [localNote, hierarchy])

  const showNoteTypeSuggestion = suggestions.noteType && noteTypes.includes(suggestions.noteType) && suggestions.noteType !== entry.noteType
  const objectSuggestions = suggestions.objects.filter(s => s.object !== entry.object)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const allObjects: ObjectOption[] = []
    for (const group of Object.values(hierarchy.objects)) {
      for (const obj of group) {
        if (obj.object.toLowerCase().includes(q) || obj.objectGroup.toLowerCase().includes(q)) {
          allObjects.push(obj)
        }
      }
    }
    return allObjects.slice(0, 8)
  }, [searchQuery, hierarchy])

  const handleObjectSelect = (obj: ObjectOption) => {
    onUpdate({ object: obj.object, objectGroup: obj.objectGroup, objectType: obj.objectType })
    setSearchQuery('')
  }

  const handleNoteChange = (newNote: string) => {
    setLocalNote(newNote)
    onUpdate({ note: newNote })
  }

  const applyNoteTypeSuggestion = () => {
    if (suggestions.noteType) {
      onUpdate({ noteType: suggestions.noteType })
    }
  }

  const applyObjectSuggestion = (obj: ObjectOption) => {
    onUpdate({ object: obj.object, objectGroup: obj.objectGroup, objectType: obj.objectType })
  }

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddSource(true)
    } else {
      onUpdate({ source: val })
      setShowAddSource(false)
    }
  }

  const handleAddSource = () => {
    const trimmed = newSourceName.trim()
    if (trimmed) {
      addTag({ name: trimmed, category: 'source' })
      onUpdate({ source: trimmed })
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
      onUpdate({ objectType: val, objectGroup: '', object: '' })
      setSearchQuery('')
      setShowAddObjectType(false)
      setNewObjectTypeName('')
    }
  }

  const handleAddObjectType = () => {
    const trimmed = newObjectTypeName.trim()
    if (trimmed) {
      addTag({ name: trimmed, category: 'object_type' })
      onUpdate({ objectType: trimmed, objectGroup: '', object: '' })
      setNewObjectTypeName('')
      setShowAddObjectType(false)
      setSearchQuery('')
      toast('Object type added', 'success')
    }
  }

  const handleObjectGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddObjectGroup(true)
    } else {
      onUpdate({ objectGroup: val, object: '' })
      setSearchQuery('')
      setShowAddObjectGroup(false)
      setNewObjectGroupName('')
    }
  }

  const handleAddObjectGroup = () => {
    const trimmed = newObjectGroupName.trim()
    if (trimmed && entry.objectType) {
      addTag({ name: entry.objectType + '|' + trimmed, category: 'object_group' })
      onUpdate({ objectGroup: trimmed, object: '' })
      setNewObjectGroupName('')
      setShowAddObjectGroup(false)
      setSearchQuery('')
      toast('Object group added', 'success')
    }
  }

  const handleObjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      setShowAddObject(true)
    } else {
      onUpdate({ object: val })
      setShowAddObject(false)
    }
  }

  const handleAddObject = () => {
    const trimmed = newObjectName.trim()
    if (trimmed && entry.objectType && entry.objectGroup) {
      addTag({ name: entry.objectType + '|' + entry.objectGroup + '|' + trimmed, category: 'object' })
      onUpdate({ object: trimmed })
      setNewObjectName('')
      setShowAddObject(false)
      toast('Object added', 'success')
    }
  }

  function shortenLabel(type: string): string {
    if (type === 'Activity') return 'Act'
    if (type === 'Complaints') return 'Cmpl'
    if (type === 'Abnormality') return 'Abn'
    if (type === 'Resolved Complaint') return 'RC'
    return type.slice(0, 3)
  }

  const noteTypeColor = getNoteTypeColor(entry.noteType)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="rounded-xl border border-neutral-800/50 bg-neutral-900/60 overflow-hidden"
    >
      {/* Collapsed header */}
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: noteTypeColor }}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: noteTypeColor }}>
              {entry.noteType}
            </span>
            {entry.object && (
              <span className="text-[10px] text-neutral-400">
                Â· {entry.object}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-200 leading-snug line-clamp-2">
            {entry.note}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-lg hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {isEditing ? <Check size={14} /> : <Pencil size={14} />}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded edit view */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-neutral-800/50 pt-3">
              {/* Note Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Note Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {noteTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => onUpdate({ noteType: type })}
                      className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border transition-all"
                      style={{
                        backgroundColor: entry.noteType === type ? getNoteTypeColor(type) : 'transparent',
                        borderColor: getNoteTypeColor(type),
                        color: entry.noteType === type ? '#fff' : getNoteTypeColor(type),
                      }}
                    >
                      {shortenLabel(type)}
                    </button>
                  ))}
                </div>

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

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Note</label>
                <textarea
                  value={localNote}
                  onChange={e => handleNoteChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 resize-none min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Equipment search + suggestions */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Equipment</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery || entry.object}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    className="w-full h-9 px-3 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                  />
                  {entry.object && !searchQuery && (
                    <button
                      type="button"
                      onClick={() => { onUpdate({ object: '', objectGroup: '', objectType: '' }); setSearchQuery('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                    >
                      âœ•
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

                {searchQuery && searchResults.length > 0 && (
                  <div className="rounded-lg border border-neutral-800/50 bg-neutral-900/60 overflow-hidden">
                    {searchResults.map((obj, i) => (
                      <button
                        key={`${obj.objectGroup}-${obj.object}-${i}`}
                        type="button"
                        onClick={() => handleObjectSelect(obj)}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-800/40 transition-colors border-b border-neutral-800/50 last:border-0"
                      >
                        <span className="text-sm text-neutral-200 font-medium">{obj.object}</span>
                        <span className="text-xs text-neutral-400 ml-2">{obj.objectGroup} Â· {obj.objectType}</span>
                      </button>
                    ))}
                  </div>
                )}
                {entry.object && !searchQuery && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <span className="text-sm text-teal-400 font-medium">{entry.object}</span>
                    <span className="text-xs text-neutral-400">{entry.objectGroup} Â· {entry.objectType}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDropdowns(!showDropdowns)}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showDropdowns ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showDropdowns ? 'Hide' : 'Show'} category selectors
                </button>
                {showDropdowns && (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Select
                        label="Type"
                        options={typeOptions}
                        placeholder="Select type..."
                        value={showAddObjectType ? '' : entry.objectType}
                        onChange={handleObjectTypeChange}
                      />
                      <AnimatePresence>
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
                              placeholder="New type name..."
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
                      </AnimatePresence>
                    </div>
                    {entry.objectType && (
                      <div className="space-y-1.5">
                        <Select
                          label="Group"
                          options={groupOptions}
                          placeholder="Select group..."
                          value={showAddObjectGroup ? '' : entry.objectGroup}
                          onChange={handleObjectGroupChange}
                        />
                        <AnimatePresence>
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
                                placeholder="New group name..."
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
                        </AnimatePresence>
                      </div>
                    )}
                    {entry.objectGroup && (
                      <div className="space-y-1.5">
                        <Select
                          label="Object"
                          options={objectOptions}
                          placeholder="Select object..."
                          value={showAddObject ? '' : entry.object}
                          onChange={handleObjectChange}
                        />
                        <AnimatePresence>
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
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date & Source */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Date"
                    type="date"
                    value={entry.date}
                    onChange={e => onUpdate({ date: e.target.value })}
                  />
                  <Select
                    label="Source"
                    options={sourceOptions}
                    value={showAddSource ? '' : entry.source}
                    onChange={handleSourceChange}
                  />
                </div>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
