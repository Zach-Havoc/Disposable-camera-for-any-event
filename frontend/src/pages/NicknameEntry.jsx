import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function NicknameEntry() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
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
    if (!name) return
    sessionStorage.setItem(`nickname_${eventId}`, name)
    navigate(`/event/${eventId}/camera`)
  }

  if (loading) return <Screen><p style={{ color: '#888' }}>Loading event…</p></Screen>
  if (error) return <Screen><p style={{ color: '#f87171' }}>{error}</p></Screen>

  return (
    <Screen>
      <div style={styles.card}>
        <div style={styles.cameraIcon}>📷</div>
        <h1 style={styles.eventName}>{event.name}</h1>
        <p style={styles.subtitle}>Enter your nickname to open the camera</p>

        <form onSubmit={handleStart} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Your nickname (e.g. John)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={30}
            autoFocus
          />
          <button
            style={{
              ...styles.button,
              opacity: nickname.trim() ? 1 : 0.4,
            }}
            type="submit"
            disabled={!nickname.trim()}
          >
            Open Camera
          </button>
        </form>

        <p style={styles.hint}>
          Your photos will be uploaded directly to the event album.
        </p>
      </div>
    </Screen>
  )
}

function Screen({ children }) {
  return (
    <div style={styles.screen}>{children}</div>
  )
}

const styles = {
  screen: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#0a0a0a',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
  },
  cameraIcon: {
    fontSize: '56px',
    lineHeight: 1,
  },
  eventName: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '15px',
    color: '#888',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #333',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: '16px',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#fff',
    color: '#000',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'opacity 0.15s',
  },
  hint: {
    fontSize: '13px',
    color: '#555',
    marginTop: '8px',
  },
}
