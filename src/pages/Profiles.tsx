import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CircleDot, Factory } from 'lucide-react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import type { LogEntry, ObjectOption } from '@/types'

type Severity = 'critical' | 'warning' | 'normal'

interface AssetNode extends ObjectOption {
  entries: LogEntry[]
  severity: Severity
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

export function Profiles() {
  const navigate = useNavigate()
  const { entries, getHierarchy, removeEntry } = useDatabase()
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedObject, setSelectedObject] = useState<string>('')
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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
          groupSeverity = mergeSeverity(groupSeverity, severity)
          return { ...obj, entries, severity }
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

  const groupedEntries = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of selectedEntries) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [selectedEntries])

  const selectType = (typeNode: TypeNode) => {
    setSelectedType(typeNode.type)
    const firstAsset = typeNode.groups.flatMap(group => group.objects)[0]
    setSelectedObject(firstAsset?.object || '')
  }

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

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <div className="grid flex-1 gap-3 px-3 pt-3 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:overflow-hidden lg:px-4">
        <section className="min-w-0 space-y-3 lg:overflow-hidden">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topology.map(typeNode => (
              <TypePanel
                key={typeNode.type}
                typeNode={typeNode}
                active={selectedTypeNode?.type === typeNode.type}
                onClick={() => selectType(typeNode)}
              />
            ))}
          </div>

          {selectedTypeNode && (
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 p-3">
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

              <div className="max-h-[250px] space-y-4 overflow-y-auto pr-1">
                {selectedTypeNode.groups.map(group => (
                  <GroupMatrix
                    key={group.group}
                    group={group}
                    selectedObject={selectedAsset?.object || ''}
                    onSelectObject={setSelectedObject}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="min-w-0 rounded-xl border border-neutral-800/70 bg-neutral-950/70 p-3 lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-neutral-800/60 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-mono text-lg font-bold text-neutral-100">
                  {selectedAsset?.object || 'NO-ASSET'}
                </h2>
                {selectedAsset && <SeverityDot severity={selectedAsset.severity} />}
              </div>
              <p className="mt-0.5 truncate text-[10px] font-medium text-neutral-500">
                {selectedAsset?.objectGroup || 'No group selected'}
              </p>
            </div>
            {selectedAsset && (
              <button
                onClick={() => navigate(`/equipment?object=${encodeURIComponent(selectedAsset.object)}`)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/60 text-neutral-400 transition-colors hover:border-teal-500/40 hover:text-teal-300"
                title="Open equipment profile"
              >
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {selectedEntries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-neutral-400">No entries for this asset</p>
                <p className="mt-1 text-[11px] text-neutral-600">Select another terminal in the matrix.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
                  <div key={date}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        {formatDate(date)}
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
          // {group.group}
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

  return (
    <button
      onClick={onClick}
      className={`min-w-0 rounded-lg border px-1 py-2 text-center transition-all duration-150 active:scale-[0.97] ${severityClass} ${
        active ? 'border-teal-400 ring-2 ring-teal-400 shadow-[0_0_16px_rgba(45,212,191,0.22)]' : 'hover:border-neutral-600'
      }`}
    >
      <span className="block truncate font-mono text-[11px] font-bold">{asset.object}</span>
      <span className="block truncate text-[8.5px] uppercase tracking-tight opacity-70">
        {getStatusLabel(asset.severity)}
      </span>
    </button>
  )
}

function SeverityDot({ severity }: { severity: Severity }) {
  if (severity === 'normal') {
    return <CircleDot size={10} className="flex-shrink-0 text-neutral-700" />
  }

  const className = severity === 'critical'
    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.75)]'
    : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.65)]'

  return <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${className}`} />
}
