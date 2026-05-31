import type { NoteType, ObjectHierarchy, ObjectOption } from '@/types'

export interface ParsedEntry {
  note: string
  comment: string
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
 * Generate search patterns for an object name.
 * For "R5-F" this produces: ["r5-f", "r5f", "5f", "r5 f", "5 f"]
 * For "P2-4" this produces: ["p2-4", "p24", "24", "p2 4", "2 4"]
 * For "HCl Bulk Storage Tank" this produces: ["hcl bulk storage tank", "hclbulkstoragetank"]
 *
 * The idea: users write equipment names in many formats.
 * "R5F" should still match "R5-F". "5F" should match too.
 */
function generateSearchPatterns(name: string): string[] {
  const lower = name.toLowerCase()
  const patterns = new Set<string>()

  // 1. Exact name as-is
  patterns.add(lower)

  // 2. Remove all hyphens: "R5-F" → "r5f"
  const noHyphens = lower.replace(/-/g, '')
  patterns.add(noHyphens)

  // 3. Replace hyphens with spaces: "R5-F" → "r5 f"
  const hyphensToSpaces = lower.replace(/-/g, ' ')
  patterns.add(hyphensToSpaces)

  // 4. For hyphenated names like "R5-F", extract suffix patterns
  //    "R5-F" → "5f", "P2-4" → "24"
  const hyphenMatch = lower.match(/^[a-z]+-(.+)$/)
  if (hyphenMatch) {
    // Remove the leading letter(s) and hyphen, keep the rest: "R5-F" → "5f"
    const suffixWithNumber = lower.replace(/^[a-z]+/, '').replace(/-/g, '')
    patterns.add(suffixWithNumber)

    // Add spaced version: "5 f"
    const suffixSpaced = suffixWithNumber.replace(/(\d)([a-z])/g, '$1 $2')
    patterns.add(suffixSpaced)
  }

  // 5. For names with spaces, also try without spaces
  if (lower.includes(' ')) {
    patterns.add(lower.replace(/\s+/g, ''))
  }

  // Filter out very short patterns (≤1 char) that would cause false positives
  return [...patterns].filter(p => p.length > 1)
}

/**
 * Check if any search pattern for an object name appears in the note text.
 * Uses normalized matching: the note is also checked in hyphen-stripped form.
 */
function matchesNote(objectName: string, noteLower: string): boolean {
  const patterns = generateSearchPatterns(objectName)

  // Normalize the note text: create versions without hyphens/spaces
  const noteNoHyphens = noteLower.replace(/-/g, '')
  const noteNoSpaces = noteLower.replace(/\s+/g, '')

  for (const pattern of patterns) {
    if (pattern.length <= 1) continue

    // Check pattern against: original note
    if (noteLower.includes(pattern)) return true
    // Check hyphen-free patterns against hyphen-free note
    if (!pattern.includes('-') && noteNoHyphens.includes(pattern)) return true
    // Check space-free patterns against space-free note
    if (!pattern.includes(' ') && noteNoSpaces.includes(pattern)) return true
  }

  return false
}

/**
 * Find all matching objects from the hierarchy based on note text.
 * Uses fuzzy matching: "R5F" matches "R5-F", "5F" matches "R5-F", etc.
 * Returns up to `maxResults` matches, sorted by specificity (longest match first).
 * Skips very short names (≤2 chars) to avoid false positives.
 */
export function detectObjects(note: string, hierarchy: ObjectHierarchy, maxResults: number = 3): ObjectOption[] {
  const lower = note.toLowerCase()
  const matches: (ObjectOption & { matchLength: number })[] = []

  for (const groupKey of Object.keys(hierarchy.objects)) {
    for (const obj of hierarchy.objects[groupKey]) {
      const objectName = obj.object
      if (objectName.length <= 2) continue

      if (matchesNote(objectName, lower)) {
        // Use original name length as priority — longer names are more specific
        matches.push({ ...obj, matchLength: objectName.length })
      }
    }
  }

  // Sort by match length descending (prefer more specific/longer matches)
  matches.sort((a, b) => b.matchLength - a.matchLength)

  // Deduplicate by object key
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
      comment: '',
      date,
      noteType,
      object: obj?.object || '',
      objectGroup: obj?.objectGroup || '',
      objectType: obj?.objectType || '',
      source,
    }
  })
}
