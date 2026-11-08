import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function OrganizerDashboard() {
  const [organizer, setOrganizer] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', eventDate: '' })
  const [qrModal, setQrModal] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('organizer_token', token)
      window.history.replaceState({}, '', '/organizer')
    }

    api('/api/organizer/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOrganizer(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!organizer) return
    api('/api/organizer/events')
      .then(r => r.json())
      .then(setEvents)
  }, [organizer])

  async function createEvent(e) {
    e.preventDefault()
    setCreating(true)
    const res = await api('/api/organizer/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setCreating(false); return }
    setEvents(prev => [{ ...data, photo_count: 0, active: 1 }, ...prev])
    setForm({ name: '', eventDate: '' })
    setCreating(false)
  }

  async function showQR(eventId) {
    const res = await api(`/api/organizer/events/${eventId}/qr`)
    const data = await res.json()
    setQrModal(data)
  }

  async function deactivate(eventId) {
    if (!confirm('Deactivate this event? Guests will no longer be able to upload.')) return
    await api(`/api/organizer/events/${eventId}/deactivate`, { method: 'PATCH' })
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, active: 0 } : e))
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('organizer_token')
    setOrganizer(null)
  }

  if (loading) return <Page><p style={{ color: '#888' }}>Loading…</p></Page>

  if (!organizer) return (
    <Page>
      <div style={s.card}>
        <div style={{ fontSize: 52 }}>📷</div>
        <h1 style={s.title}>DisposableCam</h1>
        <p style={s.subtitle}>Organizer dashboard — manage your events and QR codes</p>
        <a href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`} style={s.googleBtn}>
          <GoogleIcon />
          Continue with Google
        </a>
        <p style={s.hint}>Your photos will be saved to your Google Drive.</p>
      </div>
    </Page>
  )

  return (
    <Page>
      <div style={s.dashboard}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Your Events</h1>
            <p style={s.subtitle}>{organizer.email}</p>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Log out</button>
        </div>

        {/* Create event form */}
        <form onSubmit={createEvent} style={s.createForm}>
          <input
            style={s.input}
            placeholder="Event name (e.g. Sarah & John Wedding)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            style={s.input}
            type="date"
            value={form.eventDate}
            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
            required
          />
          <button style={{ ...s.btn, opacity: creating ? 0.5 : 1 }} type="submit" disabled={creating}>
            {creating ? 'Creating…' : '+ New Event'}
          </button>
        </form>

        {/* Events list */}
        {events.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', marginTop: 32 }}>No events yet. Create one above.</p>
        ) : (
          <div style={s.eventList}>
            {events.map(ev => (
              <div key={ev.id} style={{ ...s.eventCard, opacity: ev.active ? 1 : 0.5 }}>
                <div style={s.eventInfo}>
                  <span style={s.eventName}>{ev.name}</span>
                  <span style={s.eventMeta}>{ev.event_date} · {ev.photo_count} photos</span>
                  {!ev.active && <span style={s.badge}>Inactive</span>}
                </div>
                <div style={s.eventActions}>
                  <button style={s.actionBtn} onClick={() => showQR(ev.id)}>QR Code</button>
                  {ev.active && (
                    <button style={{ ...s.actionBtn, color: '#f87171' }} onClick={() => deactivate(ev.id)}>
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR modal */}
      {qrModal && (
        <div style={s.overlay} onClick={() => setQrModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...s.title, fontSize: 18, marginBottom: 16 }}>Scan to open camera</h2>
            <img src={qrModal.qr} alt="QR code" style={{ width: 240, height: 240, borderRadius: 12 }} />
            <p style={{ ...s.hint, marginTop: 12, wordBreak: 'break-all' }}>{qrModal.url}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a href={qrModal.qr} download="event-qr.png" style={s.btn}>Download PNG</a>
              <button style={{ ...s.btn, background: '#1a1a1a', color: '#fff' }} onClick={() => setQrModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function Page({ children }) {
  return <div style={s.page}>{children}</div>
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.3 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.6 37.5 46.5 31.5 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.6l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-3.5-13.6-9.2l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  )
}

const s = {
  page: {
    minHeight: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px 64px',
    background: '#0a0a0a',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    marginTop: 48,
  },
  dashboard: {
    width: '100%',
    maxWidth: 560,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 32,
    padding: 20,
    background: '#111',
    borderRadius: 14,
    border: '1px solid #222',
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid #2a2a2a',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: 15,
    width: '100%',
  },
  btn: {
    padding: '12px 20px',
    borderRadius: 10,
    background: '#fff',
    color: '#000',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
  googleBtn: {
    padding: '13px 20px',
    borderRadius: 12,
    background: '#fff',
    color: '#000',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  logoutBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    background: '#1a1a1a',
    color: '#888',
    fontSize: 13,
    border: '1px solid #2a2a2a',
  },
  hint: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  eventCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#111',
    borderRadius: 12,
    border: '1px solid #222',
    gap: 12,
  },
  eventInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  eventName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  eventMeta: {
    fontSize: 13,
    color: '#666',
  },
  badge: {
    fontSize: 11,
    color: '#f87171',
    background: '#3f1f1f',
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-block',
    width: 'fit-content',
  },
  eventActions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    background: '#1a1a1a',
    color: '#ccc',
    fontSize: 13,
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: 20,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
}
