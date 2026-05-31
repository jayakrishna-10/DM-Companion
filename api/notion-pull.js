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

      // Auto-detect title property: find the property with type 'title'
      // Falls back to 'Note'/'note' for backward compatibility
      let noteProp = null
      for (const [key, value] of Object.entries(props)) {
        if (value.type === 'title') {
          noteProp = value
          break
        }
      }
      // Fallback to explicit names if no title-type property found
      if (!noteProp) {
        noteProp = props['Note'] || props['note'] || props['Name'] || props['name'] || props['Title'] || props['title']
      }
      const note = noteProp?.title?.map(t => t.plain_text).join('') || ''

      // Extract date — try multiple property names
      const dateProp = props['Date'] || props['date']
      const date = dateProp?.date?.start || ''

      // Extract select fields — try multiple property name variants
      const noteTypeProp = props['Note Type'] || props['note_type'] || props['Note type'] || props['noteType']
      const noteType = noteTypeProp?.select?.name || 'Activity'

      const objectProp = props['Object'] || props['object']
      const objectValue = objectProp?.select?.name || ''

      const objectGroupProp = props['Object Group'] || props['object_group'] || props['Object group'] || props['objectGroup']
      const objectGroup = objectGroupProp?.select?.name || ''

      const objectTypeProp = props['Object Type'] || props['object_type'] || props['Object type'] || props['objectType']
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
    })

    console.log(`[notion-pull] Returning ${entries.length} entries from ${allPages.length} Notion pages`)
    return res.status(200).json({ entries })
  } catch (err) {
    console.error('[notion-pull] Exception:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to pull from Notion' })
  }
}
