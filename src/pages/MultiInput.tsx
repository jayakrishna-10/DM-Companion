import { useState, useMemo } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { parseMultiInput, autoTagEntries } from '@/utils/auto-tag'
import type { LogEntryFormData, ObjectOption, ObjectHierarchy } from '@/types'
import { NOTE_TYPES, NOTE_TYPE_COLORS } from '@/types'
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
  const { addEntry, getHierarchy } = useDatabase()
  const [step, setStep] = useState<Step>('input')
  const [rawText, setRawText] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState('CWTP logbook')
  const [entries, setEntries] = useState<ParsedEntry[]>([])

  const hierarchy = getHierarchy()

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
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={20} className="text-accent" />
          <h2 className="text-lg font-bold text-text-primary">Multi Entry</h2>
        </div>

        <p className="text-xs text-text-muted">
          Paste a list of observations, activities, or complaints. Each line becomes a separate entry. Auto-tagging will suggest equipment and note types.
        </p>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
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

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Paste your list
          </label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`• R5C resin removed\n• P2-4 discharge valves are closed\n• HCl tanker unloaded\n• NRV is not working for P4-4\n1) P8B pump servicing going\n2) R7-C framework going`}
            className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none min-h-[200px]"
            rows={8}
          />
          <p className="text-[10px] text-text-muted">
            Supports bullet points (•, -, *), numbered items (1., 2.), or plain newlines
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
    <div className="p-4 space-y-3 pb-24">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setStep('input')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{entries.length} entries</span>
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
              onUpdate={(updates) => updateEntry(entry.id, updates)}
              onRemove={() => removeEntry(entry.id)}
              hierarchy={hierarchy}
            />
          ))}
        </AnimatePresence>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
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
  onUpdate: (updates: Partial<ParsedEntry>) => void
  onRemove: () => void
  hierarchy: ObjectHierarchy
}

function EntryCard({ entry, onUpdate, onRemove, hierarchy }: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localNote, setLocalNote] = useState(entry.note)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdowns, setShowDropdowns] = useState(false)

  const typeOptions = hierarchy.types.map(t => ({ value: t, label: t }))
  const groupOptions = entry.objectType
    ? (hierarchy.groups[entry.objectType] || []).map(g => ({ value: g, label: g }))
    : []
  const objectOptions = entry.objectGroup
    ? (hierarchy.objects[entry.objectGroup] || []).map(o => ({ value: o.object, label: o.object }))
    : []

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

  const noteTypeColor = NOTE_TYPE_COLORS[entry.noteType]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="rounded-xl border border-border-subtle bg-surface overflow-hidden"
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
              <span className="text-[10px] text-text-muted">
                · {entry.object}
              </span>
            )}
          </div>
          <p className="text-sm text-text-primary leading-snug line-clamp-2">
            {entry.note}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          >
            {isEditing ? <Check size={14} /> : <Pencil size={14} />}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-complaint transition-colors"
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
            <div className="px-3 pb-3 space-y-3 border-t border-border-subtle pt-3">
              {/* Note Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Note Type</label>
                <div className="flex gap-1.5">
                  {NOTE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => onUpdate({ noteType: type })}
                      className="flex-1 h-8 text-[11px] font-semibold rounded-lg border transition-all"
                      style={{
                        backgroundColor: entry.noteType === type ? NOTE_TYPE_COLORS[type] : 'transparent',
                        borderColor: NOTE_TYPE_COLORS[type],
                        color: entry.noteType === type ? '#fff' : NOTE_TYPE_COLORS[type],
                      }}
                    >
                      {type === 'Activity' ? 'Act' : type === 'Complaints' ? 'Cmpl' : type === 'Abnormality' ? 'Abn' : 'RC'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Note</label>
                <textarea
                  value={localNote}
                  onChange={e => { setLocalNote(e.target.value); onUpdate({ note: e.target.value }) }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Equipment search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Equipment</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery || entry.object}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                  {entry.object && !searchQuery && (
                    <button
                      type="button"
                      onClick={() => { onUpdate({ object: '', objectGroup: '', objectType: '' }); setSearchQuery('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchQuery && searchResults.length > 0 && (
                  <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
                    {searchResults.map((obj, i) => (
                      <button
                        key={`${obj.objectGroup}-${obj.object}-${i}`}
                        type="button"
                        onClick={() => handleObjectSelect(obj)}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-2 transition-colors border-b border-border-subtle last:border-0"
                      >
                        <span className="text-sm text-text-primary font-medium">{obj.object}</span>
                        <span className="text-xs text-text-muted ml-2">{obj.objectGroup} · {obj.objectType}</span>
                      </button>
                    ))}
                  </div>
                )}
                {entry.object && !searchQuery && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                    <span className="text-sm text-accent-light font-medium">{entry.object}</span>
                    <span className="text-xs text-text-muted">{entry.objectGroup} · {entry.objectType}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDropdowns(!showDropdowns)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showDropdowns ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showDropdowns ? 'Hide' : 'Show'} category selectors
                </button>
                {showDropdowns && (
                  <div className="space-y-2">
                    <Select
                      label="Type"
                      options={typeOptions}
                      placeholder="Select type..."
                      value={entry.objectType}
                      onChange={e => { onUpdate({ objectType: e.target.value, objectGroup: '', object: '' }); setSearchQuery('') }}
                    />
                    {entry.objectType && (
                      <Select
                        label="Group"
                        options={groupOptions}
                        placeholder="Select group..."
                        value={entry.objectGroup}
                        onChange={e => { onUpdate({ objectGroup: e.target.value, object: '' }); setSearchQuery('') }}
                      />
                    )}
                    {entry.objectGroup && (
                      <Select
                        label="Object"
                        options={objectOptions}
                        placeholder="Select object..."
                        value={entry.object}
                        onChange={e => onUpdate({ object: e.target.value })}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Date & Source */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Date"
                  type="date"
                  value={entry.date}
                  onChange={e => onUpdate({ date: e.target.value })}
                />
                <Select
                  label="Source"
                  options={[
                    { value: 'CWTP logbook', label: 'CWTP logbook' },
                    { value: 'DM Reports WA group', label: 'DM Reports WA group' },
                  ]}
                  value={entry.source}
                  onChange={e => onUpdate({ source: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}