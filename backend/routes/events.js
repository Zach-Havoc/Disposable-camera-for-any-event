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

router.get('/:id/guest-session', (req, res) => {
  const ip = req.ip
  const ua = (req.headers['user-agent'] || '').slice(0, 300)
  const session = db.prepare(
    'SELECT nickname FROM guest_sessions WHERE event_id = ? AND ip_address = ? AND user_agent = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.params.id, ip, ua)
  if (!session) return res.json({})
  const countRow = db.prepare(
    'SELECT COUNT(*) AS count FROM photos WHERE event_id = ? AND nickname = ?'
  ).get(req.params.id, session.nickname)
  res.json({ nickname: session.nickname, photoCount: countRow.count })
})

router.post('/:id/guest-session', (req, res) => {
  const { nickname } = req.body
  if (!nickname) return res.status(400).json({ error: 'Missing nickname.' })
  const ip = req.ip
  const ua = (req.headers['user-agent'] || '').slice(0, 300)
  db.prepare(
    'INSERT INTO guest_sessions (event_id, nickname, ip_address, user_agent) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, nickname, ip, ua)
  res.json({ ok: true })
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
