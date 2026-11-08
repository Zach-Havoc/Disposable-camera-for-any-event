import { google } from 'googleapis'
import { Readable } from 'stream'

function getClient(refreshToken) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function createEventFolder(refreshToken, folderName) {
  const drive = google.drive({ version: 'v3', auth: getClient(refreshToken) })

  // Find or create the top-level DisposableCam Events folder
  const parentSearch = await drive.files.list({
    q: "name = 'DisposableCam Events' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id)',
    spaces: 'drive',
  })

  let parentId
  if (parentSearch.data.files.length > 0) {
    parentId = parentSearch.data.files[0].id
  } else {
    const parent = await drive.files.create({
      requestBody: { name: 'DisposableCam Events', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    parentId = parent.data.id
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return folder.data.id
}

export async function uploadPhoto(refreshToken, folderId, filename, buffer) {
  const drive = google.drive({ version: 'v3', auth: getClient(refreshToken) })

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'image/jpeg', body: Readable.from(buffer) },
    fields: 'id',
  })

  return res.data.id
}
