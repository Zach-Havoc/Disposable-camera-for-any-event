import { Router } from 'express'
import { google } from 'googleapis'
import { nanoid } from 'nanoid'
import db from '../db/database.js'

const router = Router()

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

router.get('/google', (req, res) => {
  const url = getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file',
    ],
  })
  res.redirect(url)
})

router.get('/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('No code.')

  try {
    const client = getOAuthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()

    const sessionToken = nanoid(32)

    db.prepare(`
      INSERT INTO organizers (id, email, name, refresh_token, session_token)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        session_token = excluded.session_token
    `).run(data.id, data.email, data.name, tokens.refresh_token || null, sessionToken)

    res.redirect(`${process.env.FRONTEND_URL}/organizer?token=${sessionToken}`)
  } catch (err) {
    console.error('OAuth callback error:', err.message)
    res.status(500).send('Authentication failed.')
  }
})

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    db.prepare('UPDATE organizers SET session_token = NULL WHERE session_token = ?').run(token)
  }
  res.json({ ok: true })
})

export default router
