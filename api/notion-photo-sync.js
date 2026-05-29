// Vercel serverless function: Back up plant photos to a Notion database.
// Env vars: NOTION_API_KEY and NOTION_PHOTOS_DATABASE_ID (fallback: NOTION_PHOTO_DATABASE_ID)

const NOTION_VERSION = '2022-06-28'

function base64ToBlob(base64, mimeType) {
  const binary = Buffer.from(base64, 'base64')
  return new Blob([binary], { type: mimeType })
}

async function notionFetch(path, apiKey, options = {}) {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      ...(options.headers || {}),
    },
  })
}

async function getDatabaseSchema(apiKey, databaseId) {
  const res = await notionFetch(`/databases/${databaseId}`, apiKey)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Database schema fetch failed: HTTP ${res.status}`)
  return data.properties || {}
}

function buildPageProperties(schema, photo) {
  const properties = {}
  const photoName = photo.name || photo.tag

  if (schema.Name?.type === 'title') {
    properties.Name = { title: [{ text: { content: photoName } }] }
  } else {
    const titleEntry = Object.entries(schema).find(([, prop]) => prop.type === 'title')
    if (!titleEntry) throw new Error('Photo database must have a title property')
    const [titleName] = titleEntry
    properties[titleName] = { title: [{ text: { content: photoName } }] }
  }

  if (schema.Date?.type === 'date') {
    properties.Date = { date: { start: photo.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10) } }
  }

  if (schema.Tag?.type === 'select') {
    properties.Tag = { select: { name: photoName } }
  } else if (schema.Tag?.type === 'multi_select') {
    properties.Tag = { multi_select: [{ name: photoName }] }
  }

  if (schema['Approx Size']?.type === 'number') {
    properties['Approx Size'] = { number: photo.approxSizeKb || Math.max(1, Math.round((photo.hdSizeBytes || 0) / 1024)) }
  }

  if (photo.note && schema['Notes-Text Field']?.type === 'rich_text') {
    properties['Notes-Text Field'] = { rich_text: [{ text: { content: photo.note } }] }
  }

  for (const [name, prop] of Object.entries(schema)) {
    if (prop.type === 'date' && !properties[name]) {
      properties[name] = { date: { start: photo.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10) } }
    }
    if (prop.type === 'rich_text' && /tag|name|equipment/i.test(name) && !properties[name]) {
      properties[name] = { rich_text: [{ text: { content: photoName } }] }
    }
    if (photo.note && prop.type === 'rich_text' && /note|notes|description|comment/i.test(name) && !properties[name]) {
      properties[name] = { rich_text: [{ text: { content: photo.note } }] }
    }
    if (prop.type === 'number' && /approx|hd.*size|size.*hd/i.test(name) && !properties[name]) {
      properties[name] = { number: photo.approxSizeKb || Math.max(1, Math.round((photo.hdSizeBytes || 0) / 1024)) }
    }
  }

  return properties
}

async function createFileUpload(apiKey, photo) {
  const createRes = await notionFetch('/file_uploads', apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'single_part',
      filename: photo.filename,
      content_type: photo.mimeType,
    }),
  })
  const upload = await createRes.json()
  if (!createRes.ok) throw new Error(upload.message || `Create file upload failed: HTTP ${createRes.status}`)

  const formData = new FormData()
  formData.append('file', base64ToBlob(photo.base64Data, photo.mimeType), photo.filename)
  const uploadRes = await fetch(upload.upload_url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
    },
    body: formData,
  })
  const uploadData = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok) throw new Error(uploadData.message || `Upload file failed: HTTP ${uploadRes.status}`)

  return upload.id
}

async function attachPhoto(apiKey, pageId, schema, photo, fileUploadId) {
  const filesEntry = Object.entries(schema).find(([, prop]) => prop.type === 'files')
  if (filesEntry) {
    const [filesName] = filesEntry
    const patchRes = await notionFetch(`/pages/${pageId}`, apiKey, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          [filesName]: {
            files: [{ name: photo.filename, type: 'file_upload', file_upload: { id: fileUploadId } }],
          },
        },
      }),
    })
    const patchData = await patchRes.json().catch(() => ({}))
    if (!patchRes.ok) throw new Error(patchData.message || `Attach file property failed: HTTP ${patchRes.status}`)
  }

  const blockRes = await notionFetch(`/blocks/${pageId}/children`, apiKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      children: [{
        object: 'block',
        type: 'image',
        image: { type: 'file_upload', file_upload: { id: fileUploadId } },
      }],
    }),
  })
  const blockData = await blockRes.json().catch(() => ({}))
  if (!blockRes.ok) throw new Error(blockData.message || `Append image block failed: HTTP ${blockRes.status}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_PHOTOS_DATABASE_ID || process.env.NOTION_PHOTO_DATABASE_ID
  if (!apiKey || !databaseId) {
    return res.status(500).json({ error: 'Server configuration missing: NOTION_API_KEY or NOTION_PHOTOS_DATABASE_ID not set' })
  }

  const { photos } = req.body
  if (!Array.isArray(photos) || photos.length === 0) return res.status(400).json({ error: 'No photos provided' })

  const synced = []
  const failed = []

  let schema
  try {
    schema = await getDatabaseSchema(apiKey, databaseId)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unable to read Notion photo database schema' })
  }

  for (const photo of photos) {
    try {
      if (!photo.base64Data) throw new Error('Missing image data')
      const fileUploadId = await createFileUpload(apiKey, photo)
      const properties = buildPageProperties(schema, photo)
      const pageRes = await notionFetch('/pages', apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      })
      const pageData = await pageRes.json()
      if (!pageRes.ok) throw new Error(pageData.message || `Create page failed: HTTP ${pageRes.status}`)

      await attachPhoto(apiKey, pageData.id, schema, photo, fileUploadId)
      synced.push({ id: photo.id, notionPageId: pageData.id, notionFileUploadId: fileUploadId })
    } catch (err) {
      failed.push({ id: photo.id, error: err.message || 'Photo backup failed' })
    }
  }

  return res.status(200).json({ synced, failed })
}
