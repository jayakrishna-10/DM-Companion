import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { searchEntries } from '@/db/database'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Search, X } from 'lucide-react'
import { getNoteTypeColor } from '@/types'
import type { ObjectOption } from '@/types'

export function Profiles() {
  const navigate = useNavigate()
  const { getHierarchy, noteTypes } = useDatabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedType, setExpandedType] = useState<string | null>(null)

  const hierarchy = useMemo(() => getHierarchy(), [getHierarchy])

  // Count entries per object for badges
  const objectCounts = useMemo(() => {
    const allEntries = searchEntries('', 9999)
    const counts: Record<string, { total: number; byType: Record<string, number> }> = {}
    for (const entry of allEntries) {
      if (!entry.object) continue
      if (!counts[entry.object]) {
        counts[entry.object] = { total: 0, byType: {} }
      }
      counts[entry.object].total++
      counts[entry.object].byType[entry.noteType] = (counts[entry.object].byType[entry.noteType] || 0) + 1
    }
    return counts
  }, [])

  // Build grouped structure: objectType -> objectGroup -> objects
  const grouped = useMemo(() => {
    const result: {
      type: string
      groups: {
        group: string
        objects: (ObjectOption & { entryCount: number })[]
      }[]
    }[] = []

    for (const type of hierarchy.types) {
      const typeGroups = hierarchy.groups[type] || []
      const groupEntries = typeGroups.map(group => {
        const objects = (hierarchy.objects[group] || []).map(obj => ({
          ...obj,
          entryCount: objectCounts[obj.object]?.total || 0,
        }))
        return { group, objects }
      })
      result.push({ type, groups: groupEntries })
    }
    return result
  }, [hierarchy, objectCounts])

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return grouped
    const q = searchQuery.toLowerCase()
    return grouped
      .map(typeGroup => ({
        ...typeGroup,
        groups: typeGroup.groups
          .map(g => ({
            ...g,
            objects: g.objects.filter(o =>
              o.object.toLowerCase().includes(q) ||
              o.objectGroup.toLowerCase().includes(q) ||
              o.objectType.toLowerCase().includes(q)
            ),
          }))
          .filter(g => g.objects.length > 0),
      }))
      .filter(t => t.groups.length > 0)
  }, [grouped, searchQuery])

  const totalObjects = useMemo(
    () => filtered.reduce((sum, t) => sum + t.groups.reduce((s, g) => s + g.objects.length, 0), 0),
    [filtered]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objects..."
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {totalObjects} object{totalObjects !== 1 ? 's' : ''} across {filtered.length} type{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted text-base">No objects found</p>
            <p className="text-text-muted text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'Add entries with objects to see them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map(typeGroup => (
                <ObjectTypeSection
                  key={typeGroup.type}
                  typeGroup={typeGroup}
                  expanded={expandedType === typeGroup.type || filtered.length === 1}
                  onToggle={() => setExpandedType(
                    expandedType === typeGroup.type ? null : typeGroup.type
                  )}
                  objectCounts={objectCounts}
                  noteTypes={noteTypes}
                  onObjectClick={(objectName) => navigate(`/profile?object=${encodeURIComponent(objectName)}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Object Type Section ─── */

function ObjectTypeSection({
  typeGroup,
  expanded,
  onToggle,
  objectCounts,
  noteTypes,
  onObjectClick,
}: {
  typeGroup: {
    type: string
    groups: {
      group: string
      objects: (ObjectOption & { entryCount: number })[]
    }[]
  }
  expanded: boolean
  onToggle: () => void
  objectCounts: Record<string, { total: number; byType: Record<string, number> }>
  noteTypes: string[]
  onObjectClick: (objectName: string) => void
}) {
  const totalEntries = typeGroup.groups.reduce(
    (sum, g) => sum + g.objects.reduce((s, o) => s + o.entryCount, 0), 0
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* Type header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <span className="text-sm font-bold text-accent">
              {typeGroup.type.charAt(0)}
            </span>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-primary">{typeGroup.type}</h3>
            <p className="text-[11px] text-text-muted">
              {typeGroup.groups.length} group{typeGroup.groups.length !== 1 ? 's' : ''} · {totalEntries} entries
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <ChevronRight size={18} className="text-text-muted" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {typeGroup.groups.map(groupData => (
                <ObjectGroupCard
                  key={groupData.group}
                  groupName={groupData.group}
                  objects={groupData.objects}
                  objectCounts={objectCounts}
                  noteTypes={noteTypes}
                  onObjectClick={onObjectClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Object Group Card ─── */

function ObjectGroupCard({
  groupName,
  objects,
  objectCounts,
  noteTypes,
  onObjectClick,
}: {
  groupName: string
  objects: (ObjectOption & { entryCount: number })[]
  objectCounts: Record<string, { total: number; byType: Record<string, number> }>
  noteTypes: string[]
  onObjectClick: (objectName: string) => void
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-1 mb-1.5">
        {groupName}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {objects.map(obj => (
          <ObjectCard
            key={obj.object}
            object={obj}
            counts={objectCounts[obj.object]}
            noteTypes={noteTypes}
            onClick={() => onObjectClick(obj.object)}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Object Card ─── */

function ObjectCard({
  object,
  counts,
  noteTypes,
  onClick,
}: {
  object: ObjectOption & { entryCount: number }
  counts?: { total: number; byType: Record<string, number> }
  noteTypes: string[]
  onClick: () => void
}) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className="relative text-left p-3 rounded-lg bg-surface hover:bg-surface-2 border border-border-subtle hover:border-border transition-all duration-150 active:scale-[0.98] group"
    >
      <h5 className="text-sm font-semibold text-text-primary truncate mb-1">
        {object.object}
      </h5>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted">
          {object.entryCount} entr{object.entryCount !== 1 ? 'ies' : 'y'}
        </span>
      </div>
      {/* Mini type indicators */}
      {counts && counts.total > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          {noteTypes.slice(0, 4).map(type => {
            const count = counts.byType[type] || 0
            if (count === 0) return null
            return (
              <span
                key={type}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getNoteTypeColor(type) }}
                title={`${type}: ${count}`}
              />
            )
          })}
        </div>
      )}
      {/* Chevron indicator */}
      <ChevronRight
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </motion.button>
  )
}