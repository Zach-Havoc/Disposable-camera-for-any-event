import db from './db/database.js'

db.prepare(`
  INSERT OR REPLACE INTO events (id, name, event_date, photo_limit, active)
  VALUES ('test-wedding-2026', 'Sarah & John Wedding', '2026-12-31', 20, 1)
`).run()

console.log('Seeded test event: test-wedding-2026')
console.log('Open: http://localhost:5173/event/test-wedding-2026')
