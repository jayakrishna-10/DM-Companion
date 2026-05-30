import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleDot,
  Factory,
  Search,
  ChevronLeft,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { LogEntry, ObjectOption } from '@/types'
import { getNoteTypeColor } from '@/types'

type Severity = 'critical' | 'warning' | 'normal'

interface AssetNode extends ObjectOption {
  entries: LogEntry[]
  severity: Severity
  hasResolvedHistory: boolean
}

interface GroupNode {
  group: string
  objects: AssetNode[]
  severity: Severity
}

interface TypeNode {
  type: string
  code: string
  groups: GroupNode[]
  severity: Severity
  objectCount: number
  entryCount: number
}

type SearchAssetNode = AssetNode & { type: string; group: string }

const TYPE_META: Record<string, { code: string; color: string; accent: string }> = {
  pumps: { code: 'P', color: 'text-teal-300', accent: 'border-teal-500/50' },
  pump: { code: 'P', color: 'text-teal-300', accent: 'border-teal-500/50' },
  blowers: { code: 'B', color: 'text-cyan-300', accent: 'border-cyan-500/50' },
  blower: { code: 'B', color: 'text-cyan-300', accent: 'border-cyan-500/50' },
  exchangers: { code: 'EX', color: 'text-amber-300', accent: 'border-amber-500/50' },
  exchanger: { code: 'EX', color: 'text-amber-300', accent: 'border-amber-500/50' },
  filters: { code: 'F', color: 'text-emerald-300', accent: 'border-emerald-500/50' },
  filter: { code: 'F', color: 'text-emerald-300', accent: 'border-emerald-500/50' },
  valves: { code: 'V', color: 'text-violet-300', accent: 'border-violet-500/50' },
  valve: { code: 'V', color: 'text-violet-300', accent: 'border-violet-500/50' },
  tanks: { code: 'TK', color: 'text-sky-300', accent: 'border-sky-500/50' },
  tank: { code: 'TK', color: 'text-sky-300', accent: 'border-sky-500/50' },
}

function getTypeMeta(type: string) {
  const normalized = type.toLowerCase().trim()
  return TYPE_META[normalized] || {
    code: type.split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase() || 'OBJ',
    color: 'text-neutral-200',
    accent: 'border-teal-500/50',
  }
}

function getStatusLabel(severity: Severity) {
  if (severity === 'critical') return 'Critical'
  if (severity === 'warning') return 'Alert'
  return 'Normal'
}

function mergeSeverity(a: Severity, b: Severity): Severity {
  if (a === 'critical' || b === 'critical') return 'critical'
  if (a === 'warning' || b === 'warning') return 'warning'
  return 'normal'
}

function getAssetSeverity(entries: LogEntry[], resolvedObjects: Set<string>): Severity {
  const objectName = entries[0]?.object?.toLowerCase().trim()
  const isResolved = objectName ? resolvedObjects.has(objectName) : false
  if (isResolved) return 'normal'

  let severity: Severity = 'normal'
  for (const entry of entries) {
    const noteType = entry.noteType.toLowerCase()
    const note = entry.note.toLowerCase()
    if (noteType.includes('complaint') && !noteType.includes('resolved')) {
      severity = 'critical'
    } else if (noteType.includes('abnormal') || note.includes('critical')) {
      severity = mergeSeverity(severity, 'warning')
    }
  }
  return severity
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  } catch {
    return dateStr
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

type MobileStep = 'types' | 'groups' | 'assets' | 'detail'

export function Profiles() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { entries, getHierarchy, removeEntry } = useDatabase()
  const isMobile = useMediaQuery('(max-width: 1023px)')

  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedObject, setSelectedObject] = useState<string>('')
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [mobileStep, setMobileStep] = useState<MobileStep>('types')

  const hierarchy = getHierarchy()

  const allEntries = useMemo(() => Array.from(entries.values()).flat(), [entries])

  const entriesByObject = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of allEntries) {
      if (!entry.object) continue
      const key = entry.object.toLowerCase().trim()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    for (const entries of map.values()) {
      entries.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    }
    return map
  }, [allEntries])

  const resolvedObjects = useMemo(() => {
    const objects = new Set<string>()
    for (const entry of allEntries) {
      if (entry.noteType.toLowerCase().includes('resolved') && entry.object) {
        objects.add(entry.object.toLowerCase().trim())
      }
    }
    return objects
  }, [allEntries])

  const topology = useMemo<TypeNode[]>(() => {
    return hierarchy.types.map(type => {
      const meta = getTypeMeta(type)
      const groups = (hierarchy.groups[type] || []).map(group => {
        let groupSeverity: Severity = 'normal'
        const objects = (hierarchy.objects[group] || []).map(obj => {
          const entries = entriesByObject.get(obj.object.toLowerCase().trim()) || []
          const severity = getAssetSeverity(entries, resolvedObjects)
          const hasResolvedHistory = entries.some(e => e.noteType.toLowerCase().includes('resolved'))
          groupSeverity = mergeSeverity(groupSeverity, severity)
          return { ...obj, entries, severity, hasResolvedHistory }
        })
        return { group, objects, severity: groupSeverity }
      })

      const objectCount = groups.reduce((sum, group) => sum + group.objects.length, 0)
      const entryCount = groups.reduce(
        (sum, group) => sum + group.objects.reduce((inner, obj) => inner + obj.entries.length, 0),
        0,
      )
      const severity = groups.reduce<Severity>((current, group) => mergeSeverity(current, group.severity), 'normal')

      return { type, code: meta.code, groups, severity, objectCount, entryCount }
    })
  }, [entriesByObject, hierarchy, resolvedObjects])

  const selectedTypeNode = useMemo(
    () => topology.find(node => node.type === selectedType) || topology[0],
    [selectedType, topology],
  )

  const selectedAsset = useMemo(() => {
    if (!selectedTypeNode) return null
    const assets = selectedTypeNode.groups.flatMap(group => group.objects)
    return assets.find(asset => asset.object === selectedObject) || assets[0] || null
  }, [selectedObject, selectedTypeNode])

  const selectedEntries = useMemo(() => selectedAsset?.entries || [], [selectedAsset])

  const allAssets = useMemo(() => {
    return topology.flatMap(typeNode =>
      typeNode.groups.flatMap(group =>
        group.objects.map(asset => ({ ...asset, type: typeNode.type, group: group.group })),
      ),
    )
  }, [topology])

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return selectedEntries
    return selectedEntries.filter(e => e.noteType === activeFilter)
  }, [selectedEntries, activeFilter])

  const groupedEntries = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of filteredEntries) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [filteredEntries])

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []

    return allAssets
      .filter(asset =>
        asset.object.toLowerCase().includes(q) ||
        asset.objectGroup.toLowerCase().includes(q) ||
        asset.objectType.toLowerCase().includes(q) ||
        asset.group.toLowerCase().includes(q) ||
        asset.type.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const aExact = a.object.toLowerCase() === q ? 0 : 1
        const bExact = b.object.toLowerCase() === q ? 0 : 1
        return aExact - bExact || b.entries.length - a.entries.length || a.object.localeCompare(b.object)
      })
      .slice(0, 3)
  }, [allAssets, searchQuery])

  const selectSearchResult = (asset: SearchAssetNode) => {
    setSelectedType(asset.type)
    setSelectedObject(asset.object)
    setActiveFilter('all')
    setShowSearchSuggestions(false)
    if (isMobile) setMobileStep('detail')
  }

  // Filtered groups/assets for universal profile search
  const filteredGroups = useMemo(() => {
    if (!selectedTypeNode || !searchQuery.trim()) return selectedTypeNode?.groups || []
    const q = searchQuery.toLowerCase().trim()
    return topology.flatMap(typeNode =>
      typeNode.groups
        .map(group => ({
          ...group,
          group: typeNode.type === selectedTypeNode.type ? group.group : `${typeNode.type} / ${group.group}`,
          objects: group.objects.filter(asset =>
            asset.object.toLowerCase().includes(q) ||
            asset.objectGroup.toLowerCase().includes(q) ||
            asset.objectType.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q) ||
            typeNode.type.toLowerCase().includes(q),
          ),
        }))
        .filter(group => group.objects.length > 0),
    )
  }, [selectedTypeNode, searchQuery, topology])

  const selectType = (typeNode: TypeNode) => {
    setSelectedType(typeNode.type)
    const firstAsset = typeNode.groups.flatMap(group => group.objects)[0]
    setSelectedObject(firstAsset?.object || '')
    if (isMobile) setMobileStep('groups')
  }

  const selectAsset = (asset: AssetNode) => {
    setSelectedObject(asset.object)
    setActiveFilter('all')
    if (isMobile) setMobileStep('detail')
  }

  const goBack = () => {
    if (mobileStep === 'detail') setMobileStep('assets')
    else if (mobileStep === 'assets') setMobileStep('groups')
    else if (mobileStep === 'groups') {
      setMobileStep('types')
    }
  }

  // Asset metadata
  const assetMeta = useMemo(() => {
    if (!selectedAsset) return null
    const total = selectedAsset.entries.length
    const lastDate = selectedAsset.entries[0]?.date || ''
    const openIssues = selectedAsset.entries.filter(e => {
      const nt = e.noteType.toLowerCase()
      return (nt.includes('complaint') && !nt.includes('resolved')) || nt.includes('abnormal')
    }).length
    return { total, lastDate, openIssues }
  }, [selectedAsset])

  // Note type counts for filter pills
  const noteTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of selectedEntries) {
      counts[entry.noteType] = (counts[entry.noteType] || 0) + 1
    }
    return counts
  }, [selectedEntries])

  const noteTypesForFilter = useMemo(() => {
    const types = Object.keys(noteTypeCounts)
    return types.sort()
  }, [noteTypeCounts])

  if (topology.length === 0) {
    return (
      <div className="flex h-full flex-col bg-neutral-950 px-4 pt-8 pb-24">
        <div className="rounded-xl border border-neutral-800/70 bg-neutral-900/40 p-5 text-center">
          <Factory size={22} className="mx-auto text-neutral-500" />
          <p className="mt-3 text-sm font-semibold text-neutral-300">No plant topology available</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Sync or add entries with object tags to populate the matrix.
          </p>
        </div>
      </div>
    )
  }

  const showTypesPanel = !isMobile || mobileStep === 'types'
  const showMatrixPanel = !isMobile || mobileStep === 'groups' || mobileStep === 'assets'
  const showDetailPanel = !isMobile || mobileStep === 'detail'

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <div className="grid flex-1 gap-3 px-3 pt-3 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:overflow-hidden lg:px-4">
        {/* Left column: Types + Matrix */}
        <section className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-hidden">
          {/* Type panels */}
          {showTypesPanel && (
            <motion.div
              initial={isMobile ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {topology.map(typeNode => (
                <TypePanel
                  key={typeNode.type}
                  typeNode={typeNode}
                  active={selectedTypeNode?.type === typeNode.type}
                  onClick={() => selectType(typeNode)}
                />
              ))}
            </motion.div>
          )}

          {/* Matrix workspace */}
          {showMatrixPanel && selectedTypeNode && (
            <motion.div
              initial={isMobile ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              className="flex min-h-[calc(100vh-15rem)] flex-col rounded-xl border border-neutral-800/70 bg-neutral-950/60 p-3 lg:min-h-0 lg:flex-1"
            >
              {/* Mobile back button */}
              {isMobile && mobileStep !== 'types' && (
                <button
                  onClick={goBack}
                  className="mb-3 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}

              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Matrix Workspace
                  </p>
                  <h2 className="truncate text-sm font-extrabold text-neutral-200">
                    {selectedTypeNode.type}
                  </h2>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 font-mono text-[9px] text-neutral-500">
                  <span>{selectedTypeNode.groups.length} GRP</span>
                  <span>{selectedTypeNode.objectCount} OBJ</span>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
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
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-neutral-900/60 border border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
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
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40">
                    {searchSuggestions.map(asset => (
                      <button
                        key={`${asset.type}-${asset.object}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectSearchResult(asset)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-900"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs font-bold text-neutral-200">{asset.object}</span>
                          <span className="block truncate text-[10px] text-neutral-500">{asset.objectGroup} · {asset.type}</span>
                        </span>
                        <SeverityDot severity={asset.severity} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Groups / Assets */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                {filteredGroups.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-neutral-500">No assets match your search</p>
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <GroupMatrix
                      key={group.group}
                      group={group}
                      selectedObject={selectedAsset?.object || ''}
                      onSelectObject={(obj) => {
                        const asset = allAssets.find(a => a.object === obj)
                        const fallbackAsset = group.objects.find(a => a.object === obj)
                        if (asset) selectSearchResult(asset)
                        else if (fallbackAsset) selectAsset(fallbackAsset)
                      }}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* Right column: Asset detail */}
        {showDetailPanel && (
          <aside className="min-w-0 rounded-xl border border-neutral-800/70 bg-neutral-950/70 p-3 lg:flex lg:min-h-0 lg:flex-col">
            {/* Mobile back button */}
            {isMobile && mobileStep === 'detail' && (
              <button
                onClick={goBack}
                className="mb-3 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <ChevronLeft size={14} />
                Back to assets
              </button>
            )}

            <div className="mb-3 flex items-start justify-between gap-3 border-b border-neutral-800/60 pb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-mono text-lg font-bold text-neutral-100">
                    {selectedAsset?.object || 'Select an asset'}
                  </h2>
                  {selectedAsset && <SeverityDot severity={selectedAsset.severity} />}
                </div>
                <p className="mt-0.5 truncate text-[10px] font-medium text-neutral-500">
                  {selectedAsset?.objectGroup || 'No group selected'}
                </p>

                {/* Asset metadata summary */}
                {assetMeta && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
                      <FileText size={10} />
                      {assetMeta.total} LOGS
                    </span>
                    {assetMeta.lastDate && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
                        LAST: {formatDate(assetMeta.lastDate)}
                      </span>
                    )}
                    {assetMeta.openIssues > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-950/20 px-1.5 py-0.5 text-[9px] font-medium text-rose-300">
                        <AlertTriangle size={10} />
                        {assetMeta.openIssues} OPEN
                      </span>
                    )}
                    {selectedAsset?.objectType && (
                      <span className="rounded-md border border-neutral-800 bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
                        {selectedAsset.objectType.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {selectedAsset && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/new?object=${encodeURIComponent(selectedAsset.object)}&objectGroup=${encodeURIComponent(selectedAsset.objectGroup)}&objectType=${encodeURIComponent(selectedAsset.objectType)}`,
                      )
                    }
                    className="flex h-8 items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 text-xs font-medium text-teal-300 transition-colors hover:bg-teal-500/20"
                    aria-label={`New log for ${selectedAsset.object}`}
                    title={`New log for ${selectedAsset.object}`}
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">New log</span>
                  </button>
                  <button
                    onClick={() => {
                      const q = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''
                      navigate(`/equipment?object=${encodeURIComponent(selectedAsset.object)}${q}`)
                    }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/60 text-neutral-400 transition-colors hover:border-teal-500/40 hover:text-teal-300"
                    aria-label={`Open equipment profile for ${selectedAsset.object}`}
                    title={`Open equipment profile for ${selectedAsset.object}`}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Note type filters */}
            {selectedEntries.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <FilterPill
                  label="All"
                  count={selectedEntries.length}
                  color="#737373"
                  active={activeFilter === 'all'}
                  onClick={() => setActiveFilter('all')}
                />
                {noteTypesForFilter.map(type => (
                  <FilterPill
                    key={type}
                    label={type}
                    count={noteTypeCounts[type] || 0}
                    color={getNoteTypeColor(type)}
                    active={activeFilter === type}
                    onClick={() => setActiveFilter(activeFilter === type ? 'all' : type)}
                  />
                ))}
              </div>
            )}

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {!selectedAsset ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Factory size={28} className="text-neutral-600" />
                  <p className="mt-3 text-sm font-semibold text-neutral-300">No asset selected</p>
                  <p className="mt-1 max-w-[16rem] text-[11px] text-neutral-500">
                    Choose a type from the matrix, then select a group and an asset to view its history and status.
                  </p>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-neutral-400">
                    {activeFilter !== 'all'
                      ? `No ${activeFilter.toLowerCase()} entries for this asset`
                      : 'No entries for this asset'}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-600">
                    {activeFilter !== 'all'
                      ? 'Try another filter or select a different asset.'
                      : 'Select another terminal in the matrix.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
                    <div key={date}>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                          {formatDateFull(date)}
                        </h3>
                        <span className="rounded-md border border-neutral-800 bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">
                          {dateEntries.length}
                        </span>
                      </div>
                      <TimelineLine>
                        <AnimatePresence>
                          {dateEntries.map(entry => (
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
          </aside>
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

function TypePanel({
  typeNode,
  active,
  onClick,
}: {
  typeNode: TypeNode
  active: boolean
  onClick: () => void
}) {
  const meta = getTypeMeta(typeNode.type)

  return (
    <motion.button
      layout
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 rounded-xl border p-2 text-left transition-all duration-150 active:scale-[0.98] ${
        active
          ? `bg-neutral-900 ${meta.accent} shadow-[0_0_18px_rgba(20,184,166,0.12)]`
          : 'border-neutral-800/70 bg-neutral-900/30 hover:border-neutral-700'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-xs font-black ${meta.color}`}>{typeNode.code}</span>
        <SeverityDot severity={typeNode.severity} />
      </div>
      <p className="truncate text-[11px] font-extrabold text-neutral-200">{typeNode.type}</p>
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-neutral-600">
        <span>{typeNode.objectCount} OBJ</span>
        <span>{typeNode.entryCount} LOG</span>
      </div>
    </motion.button>
  )
}

function GroupMatrix({
  group,
  selectedObject,
  onSelectObject,
}: {
  group: GroupNode
  selectedObject: string
  onSelectObject: (objectName: string) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {group.group}
        </h3>
        <SeverityDot severity={group.severity} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {group.objects.map(asset => (
          <AssetButton
            key={asset.object}
            asset={asset}
            active={selectedObject === asset.object}
            onClick={() => onSelectObject(asset.object)}
          />
        ))}
      </div>
    </div>
  )
}

function AssetButton({
  asset,
  active,
  onClick,
}: {
  asset: AssetNode
  active: boolean
  onClick: () => void
}) {
  const severityClass = {
    critical: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
    warning: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
    normal: 'border-neutral-800 bg-neutral-900/40 text-neutral-300',
  }[asset.severity]

  const resolvedStripe = asset.hasResolvedHistory && asset.severity === 'normal'

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={`${asset.object} — ${getStatusLabel(asset.severity)}${asset.hasResolvedHistory ? ' (resolved history)' : ''}`}
      className={`relative min-w-0 rounded-lg border px-1 py-2 text-center transition-all duration-150 active:scale-[0.97] ${severityClass} ${
        active
          ? 'border-teal-400 ring-2 ring-teal-400 shadow-[0_0_16px_rgba(45,212,191,0.22)]'
          : 'hover:border-neutral-600'
      } ${resolvedStripe ? 'border-l-2 border-l-emerald-500' : ''}`}
    >
      <span className="block truncate font-mono text-[11px] font-bold">{asset.object}</span>
      <span className="block truncate text-[8.5px] uppercase tracking-tight opacity-70">
        {getStatusLabel(asset.severity)}
      </span>
      {resolvedStripe && (
        <span className="absolute top-0.5 right-0.5">
          <CheckCircle2 size={10} className="text-emerald-500" />
        </span>
      )}
    </button>
  )
}

function SeverityDot({ severity }: { severity: Severity }) {
  const label = getStatusLabel(severity)

  if (severity === 'normal') {
    return (
      <span aria-label={`Status: ${label}`} title={`Status: ${label}`}>
        <CircleDot size={10} className="flex-shrink-0 text-neutral-700" />
      </span>
    )
  }

  const className = severity === 'critical'
    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.75)]'
    : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.65)]'

  return (
    <span
      aria-label={`Status: ${label}`}
      title={`Status: ${label}`}
      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${className}`}
    />
  )
}

/* ─── Filter pill (ported from Equipment.tsx) ─── */

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
