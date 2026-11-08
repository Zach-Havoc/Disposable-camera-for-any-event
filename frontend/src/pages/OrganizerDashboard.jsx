import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function OrganizerDashboard() {
  const [organizer, setOrganizer] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', eventDate: '' })
  const [qrModal, setQrModal] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

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
    setShowCreate(false)
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

  if (loading) return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={S.spinner} />
      </div>
    </Page>
  )

  if (!organizer) return (
    <Page>
      <div style={S.loginCard}>
        <span style={S.logo}>MOMENTA</span>
        <div style={S.loginCopy}>
          <h1 style={S.loginHeadline}>Create your event camera</h1>
          <p style={S.loginSub}>Guests scan a QR code. Photos land in your Drive. No app needed.</p>
        </div>
        <a href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`} style={S.googleBtn}>
          <GoogleIcon />
          Continue with Google
        </a>
        <p style={S.loginHint}>Secure sign-in. We only write to your Drive when you create an event.</p>
      </div>
    </Page>
  )

  return (
    <Page>
      <div style={S.dashboard}>
        {/* Header */}
        <div style={S.header}>
          <span style={S.logo}>MOMENTA</span>
          <div style={S.headerRight}>
            <span style={S.headerEmail}>{organizer.email}</span>
            <button style={S.logoutPill} onClick={logout}>Log out</button>
          </div>
        </div>

        {/* New event toggle */}
        <button
          style={{ ...S.newEventBtn, ...(showCreate ? S.newEventBtnActive : {}) }}
          onClick={() => setShowCreate(v => !v)}
        >
          <span style={{ marginRight: 6 }}>{showCreate ? '−' : '+'}</span>
          New event
        </button>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={createEvent} style={S.createForm}>
            <input
              style={S.input}
              placeholder="Event name — e.g. Sarah & John Wedding"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
            <input
              style={S.input}
              type="date"
              value={form.eventDate}
              onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
              required
            />
            <button
              style={{ ...S.createBtn, opacity: creating ? 0.55 : 1 }}
              type="submit"
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create event'}
            </button>
          </form>
        )}

        {/* Events list */}
        <div style={S.sectionLabel}>
          {events.length === 0 ? 'No events yet' : `${events.filter(e => e.active).length} active`}
        </div>

        {events.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyDot} />
            <p style={S.emptyText}>Create your first event to get a QR code.</p>
          </div>
        ) : (
          <div style={S.eventList}>
            {events.map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  ...S.eventRow,
                  opacity: ev.active ? 1 : 0.4,
                  animation: `cascade-row 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms both`,
                }}
              >
                <div style={S.eventLeft}>
                  <div style={S.eventTopRow}>
                    {ev.active ? <span style={S.activeDot} /> : null}
                    <span style={{ ...S.eventName, marginLeft: ev.active ? 8 : 0 }}>{ev.name}</span>
                  </div>
                  <span style={S.eventMeta}>
                    {ev.event_date}{ev.photo_count > 0 ? ` · ${ev.photo_count} photo${ev.photo_count !== 1 ? 's' : ''}` : ''}
                    {!ev.active && <span style={S.inactiveBadge}> · Inactive</span>}
                  </span>
                </div>
                <div style={S.eventActions}>
                  <button style={S.pill} onClick={() => showQR(ev.id)}>QR Code</button>
                  {ev.active && (
                    <button style={{ ...S.pill, ...S.pillDanger }} onClick={() => deactivate(ev.id)}>
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR bottom sheet */}
      {qrModal && (
        <div style={S.sheetOverlay} onClick={() => setQrModal(null)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <p style={S.sheetLabel}>Scan to open camera</p>
            <img src={qrModal.qr} alt="QR code" style={S.qrImg} />
            <p style={S.qrUrl}>{qrModal.url}</p>
            <div style={S.sheetActions}>
              <a href={qrModal.qr} download="event-qr.png" style={S.sheetBtn}>
                Download PNG
              </a>
              <button style={{ ...S.sheetBtn, ...S.sheetBtnSecondary }} onClick={() => setQrModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function Page({ children }) {
  return <div style={S.page}>{children}</div>
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.3 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.6 37.5 46.5 31.5 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 000 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.6l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-3.5-13.6-9.2l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  )
}

const S = {
  page: {
    minHeight: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px 80px',
    background: 'var(--ground)',
  },
  dashboard: {
    width: '100%',
    maxWidth: '560px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerEmail: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logo: {
    fontFamily: 'var(--ff-display)',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: 'var(--amber)',
  },
  logoutPill: {
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontFamily: 'var(--ff-body)',
    cursor: 'pointer',
    transition: 'color 0.15s',
  },
  newEventBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 18px',
    borderRadius: '999px',
    background: 'transparent',
    border: '1.5px solid var(--border)',
    color: 'var(--white-mid)',
    fontSize: '14px',
    fontFamily: 'var(--ff-body)',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'border-color 0.15s, color 0.15s',
    letterSpacing: '0.01em',
  },
  newEventBtnActive: {
    borderColor: 'var(--amber)',
    color: 'var(--amber)',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '28px',
    padding: '20px',
    background: 'var(--surface)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    animation: 'sheet-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
  },
  input: {
    padding: '12px 15px',
    borderRadius: '10px',
    border: '1.5px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--white)',
    fontSize: '15px',
    fontFamily: 'var(--ff-body)',
    width: '100%',
    transition: 'border-color 0.15s',
    caretColor: 'var(--amber)',
  },
  createBtn: {
    padding: '12px 20px',
    borderRadius: '999px',
    background: 'var(--amber)',
    color: '#000',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--ff-body)',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
    marginTop: '4px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '48px',
    textAlign: 'center',
  },
  emptyDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1.5px dashed var(--border)',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  eventRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--surface)',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    gap: '12px',
    transition: 'border-color 0.15s',
  },
  eventLeft: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  eventTopRow: {
    display: 'flex',
    alignItems: 'center',
  },
  activeDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--amber)',
    flexShrink: 0,
    animation: 'pulse-dot 2.4s ease-in-out infinite',
  },
  eventName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--white)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  eventMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  },
  inactiveBadge: {
    color: 'var(--danger)',
  },
  eventActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  pill: {
    padding: '7px 14px',
    borderRadius: '999px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--white-mid)',
    fontSize: '13px',
    fontFamily: 'var(--ff-body)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), color 0.1s',
  },
  pillDanger: {
    color: 'var(--danger)',
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  /* Login */
  loginCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
    textAlign: 'center',
    maxWidth: '360px',
    width: '100%',
    marginTop: '64px',
    animation: 'scale-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  loginCopy: {
    margin: '32px 0 28px',
  },
  loginHeadline: {
    fontFamily: 'var(--ff-display)',
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--white)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: '10px',
  },
  loginSub: {
    fontSize: '15px',
    color: 'var(--white-mid)',
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },
  googleBtn: {
    padding: '14px 20px',
    borderRadius: '999px',
    background: 'var(--white)',
    color: '#000',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--ff-body)',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    transition: 'opacity 0.15s',
    letterSpacing: '0.01em',
  },
  loginHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '14px',
    lineHeight: 1.5,
  },
  /* QR sheet */
  sheetOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: '#111',
    borderRadius: '20px 20px 0 0',
    padding: '14px 24px 48px',
    animation: 'sheet-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sheetHandle: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.2)',
    marginBottom: '20px',
  },
  sheetLabel: {
    fontFamily: 'var(--ff-body)',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--white-mid)',
    marginBottom: '20px',
  },
  qrImg: {
    width: '220px',
    height: '220px',
    borderRadius: '16px',
    marginBottom: '16px',
  },
  qrUrl: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    wordBreak: 'break-all',
    textAlign: 'center',
    maxWidth: '280px',
    marginBottom: '24px',
    letterSpacing: '0.02em',
    lineHeight: 1.5,
  },
  sheetActions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    maxWidth: '320px',
  },
  sheetBtn: {
    flex: 1,
    padding: '13px 16px',
    borderRadius: '999px',
    background: 'var(--amber)',
    color: '#000',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--ff-body)',
    textDecoration: 'none',
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnSecondary: {
    background: 'var(--surface-2)',
    color: 'var(--white-mid)',
    border: '1px solid var(--border)',
  },
  spinner: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid var(--border)',
    borderTopColor: 'var(--amber)',
    animation: 'spin 0.8s linear infinite',
  },
}
