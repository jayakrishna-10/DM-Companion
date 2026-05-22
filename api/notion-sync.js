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
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_DATABASE_ID not set' })
  }

  const { entries } = req.body

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'No entries provided' })
  }

  const synced = []
  const failed = []

  for (const entry of entries) {
    try {
      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            'Note': { title: [{ text: { content: entry.note } }] },
            'Date': { date: { start: entry.date } },
            'Note Type': { select: { name: entry.noteType } },
            'Object': entry.object ? { select: { name: entry.object } } : null,
            'Object Group': entry.objectGroup ? { select: { name: entry.objectGroup } } : null,
            'Object Type': entry.objectType ? { select: { name: entry.objectType } } : null,
            'Source': entry.source ? { select: { name: entry.source } } : null,
          },
        }),
      })

      if (notionRes.ok) {
        const data = await notionRes.json()
        synced.push({ id: entry.id, notionPageId: data.id })
      } else {
        const data = await notionRes.json()
        failed.push({ id: entry.id, error: data.message || `HTTP ${notionRes.status}` })
      }
    } catch (err) {
      failed.push({ id: entry.id, error: err.message || 'Network error' })
    }
  }

  return res.status(200).json({ synced, failed })
}
