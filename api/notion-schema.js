// Vercel serverless function: Fetch Notion database schema (select/multi_select options)
// Returns available tag options from the Notion database properties
// Returns: { noteTypes: string[], sources: string[], objects: string[], objectGroups: string[], objectTypes: string[] }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!apiKey || !databaseId) {
    console.error('[notion-schema] Missing env vars:', { hasApiKey: !!apiKey, hasDatabaseId: !!databaseId })
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_DATABASE_ID not set' })
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!notionRes.ok) {
      const data = await notionRes.json()
      console.error('[notion-schema] Notion API failed:', data.message || `HTTP ${notionRes.status}`)
      return res.status(notionRes.status).json({ error: data.message || 'Failed to fetch Notion database schema' })
    }

    const data = await notionRes.json()
    const props = data.properties

    // Extract select/multi_select options from each property
    const extractOptions = (prop) => {
      if (!prop) return []
      if (prop.type === 'select') return (prop.select?.options || []).map(o => ({ name: o.name, color: o.color }))
      if (prop.type === 'multi_select') return (prop.multi_select?.options || []).map(o => ({ name: o.name, color: o.color }))
      return []
    }

    // Try multiple property name variants for each field
    const noteTypeProp = props['Note Type'] || props['note_type'] || props['Note type'] || props['noteType']
    const sourceProp = props['Source'] || props['source']
    const objectProp = props['Object'] || props['object']
    const objectGroupProp = props['Object Group'] || props['object_group'] || props['Object group'] || props['objectGroup']
    const objectTypeProp = props['Object Type'] || props['object_type'] || props['Object type'] || props['objectType']

    const result = {
      noteTypes: extractOptions(noteTypeProp),
      sources: extractOptions(sourceProp),
      objects: extractOptions(objectProp),
      objectGroups: extractOptions(objectGroupProp),
      objectTypes: extractOptions(objectTypeProp),
    }

    console.log(`[notion-schema] Fetched schema: ${result.noteTypes.length} note types, ${result.sources.length} sources, ${result.objects.length} objects, ${result.objectGroups.length} groups, ${result.objectTypes.length} types`)

    return res.status(200).json(result)
  } catch (err) {
    console.error('[notion-schema] Exception:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to fetch Notion schema' })
  }
}
