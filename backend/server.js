import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import eventsRouter from './routes/events.js'
import uploadRouter from './routes/upload.js'
import authRouter from './routes/auth.js'
import organizerRouter from './routes/organizer.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
    secure: true,
  },
}))

app.use('/api/events', eventsRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/auth', authRouter)
app.use('/api/organizer', organizerRouter)

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
