import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'events.db'))

db.pragma('journal_mode = WAL')

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

export default db
