import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { searchEntries } from '@/db/database'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import type { LogEntry, ObjectOption } from '@/types'
import { getNoteTypeColor } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function Equipment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { removeEntry, noteTypes, getHierarchy } = useDatabase()

  const objectName = searchParams.get('object')

  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || objectName || '')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)

  const hierarchy = getHierarchy()

  const allProfiles = useMemo(() => {
    const profiles: ObjectOption[] = []
    for (const group of Object.keys(hierarchy.objects)) {
      profiles.push(...(hierarchy.objects[group] || []))
    }

    return profiles
      .filter((profile, index, list) => list.findIndex(item => item.object === profile.object) === index)
      .sort((a, b) => a.object.localeCompare(b.object))
  }, [hierarchy])

  const profileSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []

    return allProfiles
      .filter(profile =>
        profile.object.toLowerCase().includes(q) ||
        profile.objectGroup.toLowerCase().includes(q) ||
        profile.objectType.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const aExact = a.object.toLowerCase() === q ? 0 : 1
        const bExact = b.object.toLowerCase() === q ? 0 : 1
        return aExact - bExact || a.object.localeCompare(b.object)
      })
      .slice(0, 3)
  }, [allProfiles, searchQuery])

  const openProfile = (profile: ObjectOption) => {
    setSearchQuery(profile.object)
    setShowSearchSuggestions(false)
    setActiveFilter('all')
    navigate(`/equipment?object=${encodeURIComponent(profile.object)}&q=${encodeURIComponent(profile.object)}`)
  }

  const entries = useMemo(() => {
    if (!objectName) return []
    const raw = searchEntries(objectName)
    const lowerQuery = objectName.toLowerCase()
    return raw.filter(
      (e) => e.object && e.object.toLowerCase() === lowerQuery,
    )
  }, [objectName])

  const meta = useMemo(() => {
    if (entries.length === 0) return null
    const first = entries[0]
    return {
      object: first.object,
      objectGroup: first.objectGroup,
      objectType: first.objectType,
    }
  }, [entries])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      const t = entry.noteType
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return entries
    return entries.filter(e => e.noteType === activeFilter)
  }, [entries, activeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    const sorted = [...filteredEntries].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    )
    for (const entry of sorted) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [filteredEntries])

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Back button + header */}
      <div className="px-4 pt-3 pb-2 space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {meta && (
          <div>
            <h1 className="text-xl font-bold text-neutral-200">{meta.object}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {meta.objectType && (
                <span className="text-[9px] font-medium text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
                  {meta.objectType}
                </span>
              )}
              {meta.objectGroup && (
                <span className="text-[10px] text-neutral-500">{meta.objectGroup}</span>
              )}
            </div>
          </div>
        )}

        {!meta && (
          <div>
            <h1 className="text-xl font-bold text-neutral-200">Equipment profiles</h1>
            <p className="mt-0.5 text-[10px] text-neutral-500">Search any profile, group, or type.</p>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setShowSearchSuggestions(true)
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            placeholder="Search all profiles..."
            className="h-9 w-full rounded-lg border border-neutral-800/50 bg-neutral-900/60 pl-8 pr-8 text-xs text-neutral-200 transition-all placeholder:text-neutral-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setShowSearchSuggestions(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
          {showSearchSuggestions && profileSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40">
              {profileSuggestions.map(profile => (
                <button
                  key={`${profile.objectGroup}-${profile.object}`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => openProfile(profile)}
                  className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-neutral-900"
                >
                  <span className="truncate font-mono text-xs font-bold text-neutral-200">{profile.object}</span>
                  <span className="truncate text-[10px] text-neutral-500">{profile.objectGroup} · {profile.objectType}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterPill
            label="All"
            count={entries.length}
            color="#737373"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          {noteTypes.map((type) => {
            const count = typeCounts[type] || 0
            if (count === 0) return null
            return (
              <FilterPill
                key={type}
                label={type}
                count={count}
                color={getNoteTypeColor(type)}
                active={activeFilter === type}
                onClick={() => setActiveFilter(activeFilter === type ? 'all' : type)}
              />
            )
          })}
        </div>
      </div>

      {/* Compact Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-500 text-sm">No entries found</p>
            <p className="text-neutral-600 text-[11px] mt-1">
              {!objectName
                ? 'Search above to open an equipment profile.'
                : activeFilter !== 'all'
                ? `No ${activeFilter.toLowerCase()} entries for this equipment.`
                : 'This equipment has no log entries yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                    {formatDate(date)}
                  </h3>
                  <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
                    {dateEntries.length}
                  </span>
                </div>
                <TimelineLine>
                  <AnimatePresence>
                    {dateEntries.map((entry) => (
                      <TimelineCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => {
                          setSelectedEntry(entry)
                          setSheetOpen(true)
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </TimelineLine>
              </div>
            ))}
          </div>
        )}
      </div>

      <EntryDetailSheet
        entry={selectedEntry}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={(entry) => {
          setSheetOpen(false)
          navigate(`/new?edit=${entry.id}`)
        }}
        onDelete={(id) => {
          removeEntry(id)
          setSheetOpen(false)
          toast('Entry deleted')
        }}
        onDuplicate={(entry) => {
          setSheetOpen(false)
          navigate(`/new?duplicate=${entry.id}`)
        }}
      />
    </div>
  )
}


/* ─── Filter pill (compact) ─── */

function FilterPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all duration-150 border ${
        active
          ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
          : 'bg-neutral-800/80 text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-400'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
      <span className={active ? 'text-teal-400' : 'text-neutral-600'}>{count}</span>
    </button>
  )
}
