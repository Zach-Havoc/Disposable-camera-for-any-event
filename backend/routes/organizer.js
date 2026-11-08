import { Router } from 'express'
import { nanoid } from 'nanoid'
import QRCode from 'qrcode'
import db from '../db/database.js'
import { createEventFolder } from '../services/googleDrive.js'

const router = Router()

function requireAuth(req, res, next) {
  if (!req.session?.organizerId) return res.status(401).json({ error: 'Not authenticated.' })
  next()
}

router.get('/me', requireAuth, (req, res) => {
  const org = db.prepare('SELECT id, email, name FROM organizers WHERE id = ?').get(req.session.organizerId)
  if (!org) return res.status(401).json({ error: 'Not found.' })
  res.json(org)
})

router.get('/events', requireAuth, (req, res) => {
  const events = db.prepare(`
    SELECT e.id, e.name, e.event_date, e.photo_limit, e.active,
           COUNT(p.id) AS photo_count
    FROM events e
    LEFT JOIN photos p ON p.event_id = e.id
    WHERE e.organizer_id = ?
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all(req.session.organizerId)
  res.json(events)
})

router.post('/events', requireAuth, async (req, res) => {
  const { name, eventDate } = req.body
  if (!name || !eventDate) return res.status(400).json({ error: 'name and eventDate required.' })

  const org = db.prepare('SELECT refresh_token FROM organizers WHERE id = ?').get(req.session.organizerId)

  const id = nanoid(10)
  let driveFolderId = null

  if (org.refresh_token) {
    try {
      driveFolderId = await createEventFolder(org.refresh_token, `${name} ${eventDate}`)
    } catch (err) {
      console.error('Drive folder creation failed:', err.message)
    }
  }

  db.prepare(`
    INSERT INTO events (id, name, event_date, drive_folder_id, photo_limit, active, organizer_id)
    VALUES (?, ?, ?, ?, 20, 1, ?)
  `).run(id, name, eventDate, driveFolderId, req.session.organizerId)

  res.json({ id, name, eventDate, driveFolderId })
})

router.get('/events/:id/qr', requireAuth, async (req, res) => {
  const event = db.prepare('SELECT id, name FROM events WHERE id = ? AND organizer_id = ?')
    .get(req.params.id, req.session.organizerId)
  if (!event) return res.status(404).json({ error: 'Event not found.' })

  const url = `${process.env.FRONTEND_URL}/event/${event.id}`
  const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 })
  res.json({ qr, url })
})

router.patch('/events/:id/deactivate', requireAuth, (req, res) => {
  db.prepare('UPDATE events SET active = 0 WHERE id = ? AND organizer_id = ?')
    .run(req.params.id, req.session.organizerId)
  res.json({ ok: true })
})

export default router
