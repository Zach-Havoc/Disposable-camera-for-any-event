import { Router } from 'express'
import multer from 'multer'
import db from '../db/database.js'
import { uploadPhoto } from '../services/googleDrive.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

router.post('/', upload.single('photo'), async (req, res) => {
  const { eventId, nickname } = req.body

  if (!req.file || !eventId || !nickname) {
    return res.status(400).json({ error: 'Missing photo, eventId, or nickname.' })
  }

  const event = db.prepare(`
    SELECT e.id, e.photo_limit, e.active, e.drive_folder_id, o.refresh_token
    FROM events e
    LEFT JOIN organizers o ON o.id = e.organizer_id
    WHERE e.id = ?
  `).get(eventId)

  if (!event || !event.active) return res.status(403).json({ error: 'Event not found or inactive.' })

  const guestCount = db.prepare(
    'SELECT COUNT(*) AS count FROM photos WHERE event_id = ? AND nickname = ?'
  ).get(eventId, nickname).count

  if (guestCount >= event.photo_limit) {
    return res.status(429).json({ error: 'Photo limit reached for this guest.' })
  }

  const filename = req.file.originalname
  const info = db.prepare(
    'INSERT INTO photos (event_id, nickname, filename) VALUES (?, ?, ?)'
  ).run(eventId, nickname, filename)

  if (event.drive_folder_id && event.refresh_token) {
    try {
      const driveFileId = await uploadPhoto(event.refresh_token, event.drive_folder_id, filename, req.file.buffer)
      db.prepare('UPDATE photos SET drive_file_id = ? WHERE id = ?').run(driveFileId, info.lastInsertRowid)
    } catch (err) {
      console.error('Drive upload failed:', err.message)
    }
  }

  res.json({ ok: true, filename })
})

export default router
