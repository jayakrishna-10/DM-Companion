// Vercel serverless function: Test Notion connection
// Reads NOTION_API_KEY and NOTION_DATABASE_ID from environment variables

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!apiKey || !databaseId) {
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_DATABASE_ID not set' })
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (notionRes.ok) {
      return res.status(200).json({ success: true, message: 'Connected successfully' })
    } else {
      const data = await notionRes.json()
      return res.status(notionRes.status).json({ success: false, error: data.message || 'Connection failed' })
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Connection failed' })
  }
}
