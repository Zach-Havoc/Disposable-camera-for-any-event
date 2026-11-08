import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function NicknameEntry() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    api(`/api/events/${eventId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setEvent(data)
      })
      .catch(() => setError('Could not load event.'))
      .finally(() => setLoading(false))
  }, [eventId])

  function handleStart(e) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    sessionStorage.setItem(`nickname_${eventId}`, name)
    if (event?.name) sessionStorage.setItem(`event_name_${eventId}`, event.name)
    navigate(`/event/${eventId}/camera`)
  }

  if (loading) return (
    <div style={S.screen}>
      <div style={S.spinner} />
    </div>
  )

  if (error) return (
    <div style={S.screen}>
      <div style={S.errorWrap}>
        <div style={S.errorDot} />
        <p style={S.errorText}>{error}</p>
      </div>
    </div>
  )

  const eventDate = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={S.screen}>
      <div style={S.inner}>
        {/* Logotype */}
        <div style={S.logoWrap}>
          <span style={S.logo}>MOMENTA</span>
        </div>

        {/* Event headline */}
        <div style={S.eventBlock}>
          <h1 style={S.eventName}>{event.name}</h1>
          {eventDate && <p style={S.eventDate}>{eventDate}</p>}
        </div>

        {/* Form */}
        <form onSubmit={handleStart} style={S.form}>
          <div style={{ ...S.inputWrap, ...(focused ? S.inputWrapFocused : {}) }}>
            <input
              style={S.input}
              type="text"
              placeholder="Your name"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={30}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
            />
          </div>

          <button
            style={{
              ...S.btn,
              opacity: nickname.trim() && !submitting ? 1 : 0.4,
              transform: submitting ? 'scale(0.97)' : 'scale(1)',
            }}
            type="submit"
            disabled={!nickname.trim() || submitting}
          >
            Open camera
          </button>
        </form>

        {/* Hint */}
        <p style={S.hint}>Photos go straight to the event album — nothing stays on your phone.</p>
      </div>
    </div>
  )
}

const S = {
  screen: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px 48px',
    background: 'var(--ground)',
  },
  inner: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
    animation: 'scale-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  logoWrap: {
    marginBottom: '48px',
  },
  logo: {
    fontFamily: 'var(--ff-display)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: 'var(--amber)',
  },
  eventBlock: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  eventName: {
    fontFamily: 'var(--ff-display)',
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--white)',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    marginBottom: '8px',
  },
  eventDate: {
    fontFamily: 'var(--ff-body)',
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--white-mid)',
    letterSpacing: '0.02em',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  inputWrap: {
    width: '100%',
    borderRadius: '14px',
    border: '1.5px solid var(--border)',
    background: 'var(--surface-2)',
    transition: 'border-color 0.15s',
  },
  inputWrapFocused: {
    borderColor: 'var(--amber)',
  },
  input: {
    width: '100%',
    padding: '15px 18px',
    background: 'transparent',
    color: 'var(--white)',
    fontSize: '17px',
    fontFamily: 'var(--ff-body)',
    fontWeight: 500,
    border: 'none',
    display: 'block',
    caretColor: 'var(--amber)',
  },
  btn: {
    width: '100%',
    padding: '15px',
    borderRadius: '999px',
    background: 'var(--amber)',
    color: '#000',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--ff-body)',
    letterSpacing: '0.01em',
    transition: 'opacity 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
    border: 'none',
    cursor: 'pointer',
  },
  hint: {
    fontFamily: 'var(--ff-body)',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  spinner: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid var(--border)',
    borderTopColor: 'var(--amber)',
    animation: 'spin 0.8s linear infinite',
  },
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
  },
  errorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--danger)',
  },
  errorText: {
    fontSize: '15px',
    color: 'var(--danger)',
  },
}
