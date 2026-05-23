import type { NoteType, ObjectHierarchy, ObjectOption } from '@/types'

export interface ParsedEntry {
  note: string
  date: string
  noteType: NoteType
  object: string
  objectGroup: string
  objectType: string
  source: string
}

/**
 * Parse raw multi-line text into individual entry lines.
 * Handles bullet points (•, -, *), numbered items (1., 1), 2., etc.),
 * and plain newlines.
 */
export function parseMultiInput(raw: string): string[] {
  const lines = raw
    .split(/\n/)
    .map(line => line.trim())
    // Strip leading bullets, numbers, dashes, dots
    .map(line => line.replace(/^[\s]*[•\-\*]\s*/, ''))
    .map(line => line.replace(/^[\s]*\d+[\).\s]\s*/, ''))
    .map(line => line.trim())
    .filter(line => line.length > 0)

  return lines
}

/**
 * Detect note type from the content of a note.
 */
export function detectNoteType(note: string): NoteType {
  const lower = note.toLowerCase()

  // Resolved Complaint indicators
  const resolvedPatterns = [
    /resolved/i, /arrested/i, /rectified/i, /attended.*resolv/i,
    /fixed/i, /repaired/i, /changed.*done/i, /replaced.*done/i,
    /cleared/i, /restored/i, /taken.*service/i, /back.*normal/i,
    /issue.*resolv/i, /problem.*solv/i,
  ]
  for (const p of resolvedPatterns) {
    if (p.test(lower)) return 'Resolved Complaint'
  }

  // Complaint indicators
  const complaintPatterns = [
    /not working/i, /not.*function/i, /leak/i, /damaged/i, /broken/i,
    /tripped/i, /overload/i, /high temp/i, /temperature.*high/i,
    /noise.*found/i, /vibration/i, /shutdown.*maintenance/i,
    /given.*shutdown/i, /under.*maintenance/i, /to be (changed|attended|replaced|done)/i,
    /needs.*replac/i, /needs.*attention/i, /needs.*repair/i,
  ]
  for (const p of complaintPatterns) {
    if (p.test(lower)) return 'Complaints'
  }

  // Abnormality indicators
  const abnormalityPatterns = [
    /abnormal/i, /high.*ph/i, /low.*ph/i, /high.*temperature/i,
    /overload/i, /trip/i, /alarm/i, /deviation/i, /exceed/i,
  ]
  for (const p of abnormalityPatterns) {
    if (p.test(lower)) return 'Abnormality'
  }

  return 'Activity'
}

/**
 * Find all matching objects from the hierarchy based on note text.
 * Returns up to `maxResults` matches, sorted by specificity (longest match first).
 * Skips very short names (≤2 chars) to avoid false positives.
 */
export function detectObjects(note: string, hierarchy: ObjectHierarchy, maxResults: number = 2): ObjectOption[] {
  const lower = note.toLowerCase()
  const matches: (ObjectOption & { matchLength: number })[] = []

  for (const groupKey of Object.keys(hierarchy.objects)) {
    for (const obj of hierarchy.objects[groupKey]) {
      const objectName = obj.object.toLowerCase()
      if (objectName.length <= 2) continue

      if (lower.includes(objectName)) {
        matches.push({ ...obj, matchLength: objectName.length })
      }
    }
  }

  // Sort by match length descending (prefer more specific/longer matches)
  matches.sort((a, b) => b.matchLength - a.matchLength)

  // Deduplicate: if a longer match already covers a shorter one in the same group, skip the shorter
  const seen = new Set<string>()
  const deduped: ObjectOption[] = []
  for (const m of matches) {
    const key = `${m.object}|${m.objectGroup}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push({ object: m.object, objectGroup: m.objectGroup, objectType: m.objectType })
      if (deduped.length >= maxResults) break
    }
  }

  return deduped
}

/**
 * Find the best matching object from the hierarchy based on note text.
 * Returns the ObjectOption if a match is found, or null.
 * Prioritizes longer matches (more specific equipment names).
 */
export function detectObject(note: string, hierarchy: ObjectHierarchy): ObjectOption | null {
  const results = detectObjects(note, hierarchy, 1)
  return results.length > 0 ? results[0] : null
}

/**
 * Auto-tag a list of parsed note lines.
 */
export function autoTagEntries(
  lines: string[],
  date: string,
  source: string,
  hierarchy: ObjectHierarchy
): ParsedEntry[] {
  return lines.map(note => {
    const noteType = detectNoteType(note)
    const obj = detectObject(note, hierarchy)

    return {
      note,
      date,
      noteType,
      object: obj?.object || '',
      objectGroup: obj?.objectGroup || '',
      objectType: obj?.objectType || '',
      source,
    }
  })
}