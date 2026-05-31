// Vercel serverless function: Update existing entries in Notion
// Reads NOTION_API_KEY from environment variables
// Expects POST body: { updates: Array<{ id, notionPageId, noteType, object, objectGroup, objectType, source }> }
// Returns: { updated: Array<{ id, notionPageId }>, failed: Array<{ id, error }> }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY

  if (!apiKey) {
    console.error('[notion-update] Missing env var:', { hasApiKey: !!apiKey })
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY not set' })
  }

  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    console.warn('[notion-update] No updates provided in request body')
    return res.status(400).json({ error: 'No updates provided' })
  }

  console.log(`[notion-update] Updating ${updates.length} entries in Notion`)

  const updated = []
  const failed = []

  for (const entry of updates) {
    if (!entry.notionPageId) {
      console.error(`[notion-update] Entry #${entry.id} missing notionPageId, skipping`)
      failed.push({ id: entry.id, error: 'Missing notionPageId' })
      continue
    }

    // Build properties object — only tag-like fields are updated from the app.
    // Note/title and Date are intentionally controlled by Notion after creation.
    const properties = {
      'Note Type': { select: entry.noteType ? { name: entry.noteType } : null },
    }

    if (entry.object) {
      properties['Object'] = { select: { name: entry.object } }
    } else {
      properties['Object'] = { select: null }
    }

    if (entry.objectGroup) {
      properties['Object Group'] = { select: { name: entry.objectGroup } }
    } else {
      properties['Object Group'] = { select: null }
    }

    if (entry.objectType) {
      properties['Object Type'] = { select: { name: entry.objectType } }
    } else {
      properties['Object Type'] = { select: null }
    }

    // Source is multi_select — split comma-separated values and send as array
    if (entry.source) {
      const sources = entry.source.split(', ').filter(s => s.trim())
      properties['Source'] = { multi_select: sources.map(s => ({ name: s.trim() })) }
    } else {
      properties['Source'] = { multi_select: [] }
    }

    try {
      console.log(`[notion-update] Updating page ${entry.notionPageId} for entry #${entry.id}`)

      const notionRes = await fetch(`https://api.notion.com/v1/pages/${entry.notionPageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      })

      if (notionRes.ok) {
        updated.push({ id: entry.id, notionPageId: entry.notionPageId })
        console.log(`[notion-update] Entry #${entry.id} updated successfully`)
      } else {
        const data = await notionRes.json()
        const errorMsg = data.message || `HTTP ${notionRes.status}`
        console.error(`[notion-update] Entry #${entry.id} failed: ${errorMsg}`, JSON.stringify(data))
        failed.push({ id: entry.id, error: errorMsg })
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error'
      console.error(`[notion-update] Entry #${entry.id} exception:`, errorMsg)
      failed.push({ id: entry.id, error: errorMsg })
    }
  }

  console.log(`[notion-update] Complete: ${updated.length} updated, ${failed.length} failed`)
  return res.status(200).json({ updated, failed })
}
