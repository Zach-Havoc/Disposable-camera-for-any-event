import { Router } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/:id/guest-count', (req, res) => {
  const { nickname } = req.query
  if (!nickname) return res.json({ count: 0 })
  const row = db.prepare(
    'SELECT COUNT(*) AS count FROM photos WHERE event_id = ? AND nickname = ?'
  ).get(req.params.id, nickname)
  res.json({ count: row.count })
})

router.get('/:id', (req, res) => {
  const event = db.prepare('SELECT id, name, event_date, photo_limit, active FROM events WHERE id = ?').get(req.params.id)

  if (!event) return res.status(404).json({ error: 'Event not found.' })
  if (!event.active) return res.status(403).json({ error: 'This event has ended.' })

  const today = new Date().toISOString().slice(0, 10)
  if (event.event_date < today) {
    db.prepare('UPDATE events SET active = 0 WHERE id = ?').run(event.id)
    return res.status(403).json({ error: 'This event has expired.' })
  }

  res.json({ id: event.id, name: event.name, photoLimit: event.photo_limit })
})

export default router
