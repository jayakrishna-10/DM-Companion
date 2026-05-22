// Vercel serverless function: Sync entries to Notion
// Reads NOTION_API_KEY and NOTION_DATABASE_ID from environment variables
// Expects POST body: { entries: Array<{ id, note, date, noteType, object, objectGroup, objectType, source }> }
// Returns: { synced: Array<{ id, notionPageId }>, failed: Array<{ id, error }> }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!apiKey || !databaseId) {
    console.error('[notion-sync] Missing env vars:', { hasApiKey: !!apiKey, hasDatabaseId: !!databaseId })
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_DATABASE_ID not set' })
  }

  const { entries } = req.body

  if (!Array.isArray(entries) || entries.length === 0) {
    console.warn('[notion-sync] No entries provided in request body')
    return res.status(400).json({ error: 'No entries provided' })
  }

  console.log(`[notion-sync] Syncing ${entries.length} entries to Notion database ${databaseId}`)

  const synced = []
  const failed = []

  for (const entry of entries) {
    // Build properties object — omit empty select fields entirely
    // (Notion API rejects null property values)
    const properties = {
      'Note': { title: [{ text: { content: entry.note } }] },
      'Date': { date: { start: entry.date } },
      'Note Type': { select: { name: entry.noteType } },
    }

    if (entry.object) {
      properties['Object'] = { select: { name: entry.object } }
    }
    if (entry.objectGroup) {
      properties['Object Group'] = { select: { name: entry.objectGroup } }
    }
    if (entry.objectType) {
      properties['Object Type'] = { select: { name: entry.objectType } }
    }
    if (entry.source) {
      properties['Source'] = { multi_select: [{ name: entry.source }] }
    }

    try {
      console.log(`[notion-sync] Creating page for entry #${entry.id}: "${entry.note.substring(0, 50)}..."`)

      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties,
        }),
      })

      if (notionRes.ok) {
        const data = await notionRes.json()
        synced.push({ id: entry.id, notionPageId: data.id })
        console.log(`[notion-sync] Entry #${entry.id} synced successfully (page: ${data.id})`)
      } else {
        const data = await notionRes.json()
        const errorMsg = data.message || `HTTP ${notionRes.status}`
        console.error(`[notion-sync] Entry #${entry.id} failed: ${errorMsg}`, JSON.stringify(data))
        failed.push({ id: entry.id, error: errorMsg })
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error'
      console.error(`[notion-sync] Entry #${entry.id} exception:`, errorMsg)
      failed.push({ id: entry.id, error: errorMsg })
    }
  }

  console.log(`[notion-sync] Complete: ${synced.length} synced, ${failed.length} failed`)
  return res.status(200).json({ synced, failed })
}
