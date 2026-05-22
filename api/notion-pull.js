// Vercel serverless function: Pull entries from Notion database
// Reads NOTION_API_KEY and NOTION_DATABASE_ID from environment variables
// Returns: { entries: Array<{ note, date, noteType, object, objectGroup, objectType, source, notionPageId }> }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!apiKey || !databaseId) {
    console.error('[notion-pull] Missing env vars:', { hasApiKey: !!apiKey, hasDatabaseId: !!databaseId })
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_DATABASE_ID not set' })
  }

  try {
    let hasMore = true
    let startCursor = undefined
    const allPages = []

    // Paginate through all pages in the Notion database
    while (hasMore) {
      const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start_cursor: startCursor }),
      })

      if (!notionRes.ok) {
        const data = await notionRes.json()
        console.error('[notion-pull] Notion query failed:', data.message || `HTTP ${notionRes.status}`)
        return res.status(notionRes.status).json({ error: data.message || 'Failed to query Notion database' })
      }

      const data = await notionRes.json()
      allPages.push(...data.results)
      hasMore = data.has_more
      startCursor = data.next_cursor
    }

    console.log(`[notion-pull] Fetched ${allPages.length} pages from Notion`)

    const entries = allPages.map(page => {
      const props = page.properties

      // Extract title
      const noteProp = props['Note'] || props['note']
      const note = noteProp?.title?.map(t => t.plain_text).join('') || ''

      // Extract date
      const dateProp = props['Date'] || props['date']
      const date = dateProp?.date?.start || ''

      // Extract select fields
      const noteTypeProp = props['Note Type'] || props['note_type'] || props['Note type']
      const noteType = noteTypeProp?.select?.name || 'Activity'

      const objectProp = props['Object'] || props['object']
      const objectValue = objectProp?.select?.name || ''

      const objectGroupProp = props['Object Group'] || props['object_group'] || props['Object group']
      const objectGroup = objectGroupProp?.select?.name || ''

      const objectTypeProp = props['Object Type'] || props['object_type'] || props['Object type']
      const objectType = objectTypeProp?.select?.name || ''

      // Source is multi_select
      const sourceProp = props['Source'] || props['source']
      const source = sourceProp?.multi_select?.map(s => s.name).join(', ') || ''

      return {
        note,
        date,
        noteType,
        object: objectValue,
        objectGroup,
        objectType,
        source,
        notionPageId: page.id,
      }
    }).filter(e => e.note) // Skip pages without a title

    console.log(`[notion-pull] Returning ${entries.length} valid entries`)
    return res.status(200).json({ entries })
  } catch (err) {
    console.error('[notion-pull] Exception:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to pull from Notion' })
  }
}