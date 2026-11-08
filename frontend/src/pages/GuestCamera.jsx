import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const MAX_PHOTOS = 20

export default function GuestCamera() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [photoCount, setPhotoCount] = useState(0)
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [flash, setFlash] = useState(false)
  const [nickname, setNickname] = useState('')
  const [eventName, setEventName] = useState('')
  const [limitHit, setLimitHit] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [showGallery, setShowGallery] = useState(false)

  useEffect(() => {
    const name = localStorage.getItem(`nickname_${eventId}`)
    const evName = localStorage.getItem(`event_name_${eventId}`) || ''
    if (!name) { navigate(`/event/${eventId}`); return }
    setNickname(name)
    setEventName(evName)

    api(`/api/events/${eventId}/guest-count?nickname=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        const existing = data.count || 0
        setPhotoCount(existing)
        if (existing >= MAX_PHOTOS) setLimitHit(true)
      })
      .catch(() => {})

    startCamera('environment')
    return () => stopCamera()
  }, [eventId])

  async function startCamera(mode) {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      alert('Camera access denied. Please allow camera permissions and reload.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function toggleCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  async function capturePhoto() {
    if (photoCount >= MAX_PHOTOS || uploading || limitHit) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    setFlash(true)
    setTimeout(() => setFlash(false), 320)

    canvas.toBlob(async blob => {
      const newCount = photoCount + 1
      setPhotoCount(newCount)
      const previewUrl = URL.createObjectURL(blob)
      setPreviews(prev => [previewUrl, ...prev].slice(0, 6))

      if (newCount >= MAX_PHOTOS) setLimitHit(true)

      setUploading(true)
      try {
        const form = new FormData()
        const filename = `${nickname.toLowerCase().replace(/\s+/g, '_')}_${String(newCount).padStart(3, '0')}.jpg`
        form.append('photo', blob, filename)
        form.append('nickname', nickname)
        form.append('eventId', eventId)
        const res = await api('/api/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error('Upload failed')
      } catch {
        // silent — photo captured even if upload fails
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 1.0)
  }

  return (
    <div style={S.wrapper}>
      {/* Video */}
      <video ref={videoRef} autoPlay playsInline muted style={S.video} />

      {/* Scrims */}
      <div style={S.scrimTop} />
      <div style={S.scrimBottom} />

      {/* Flash bloom */}
      {flash && <div style={S.flashBloom} />}

      {/* Top-left: live event label */}
      <div style={S.eventLabel}>
        <span style={S.liveDot} />
        {eventName && <span style={S.eventLabelText}>{eventName}</span>}
      </div>

      {/* Top-right: frame counter */}
      <div style={S.counter}>
        <span key={photoCount} style={S.counterNum}>{photoCount}</span>
        <span style={S.counterOf}>of {MAX_PHOTOS}</span>
      </div>

      {/* Right rail: flip + gallery */}
      <div style={S.rail}>
        <button
          style={S.glyphBtn}
          onClick={toggleCamera}
          aria-label="Flip camera"
        >
          <FlipIcon />
        </button>
        <button
          style={S.glyphBtn}
          onClick={() => setShowGallery(true)}
          aria-label="View gallery"
        >
          <GalleryIcon />
        </button>
      </div>

      {/* Shutter — right bottom */}
      <div style={S.shutterWrap}>
        {limitHit ? (
          <div style={S.filmFull}>
            <span style={S.filmFullLabel}>Film full</span>
          </div>
        ) : (
          <button
            style={{
              ...S.shutter,
              transform: pressing ? 'scale(0.88)' : 'scale(1)',
              borderColor: pressing ? 'var(--amber)' : 'rgba(255,255,255,0.9)',
              background: pressing ? 'rgba(245,160,35,0.2)' : 'rgba(255,255,255,0.08)',
              transition: pressing
                ? 'transform 0.08s ease-out, background 0.08s, border-color 0.08s'
                : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, border-color 0.2s',
              opacity: uploading ? 0.65 : 1,
            }}
            onPointerDown={() => setPressing(true)}
            onPointerUp={() => setPressing(false)}
            onPointerLeave={() => setPressing(false)}
            onPointerCancel={() => setPressing(false)}
            onClick={capturePhoto}
            aria-label="Take photo"
          >
            <div style={S.shutterInner} />
          </button>
        )}
      </div>

      {/* Bottom-left: caption + thumbnails */}
      <div style={S.captionArea}>
        {previews.length > 0 && (
          <div style={S.thumbStrip}>
            {previews.slice(0, 4).map((url, i) => (
              <img
                key={url}
                src={url}
                alt=""
                style={{
                  ...S.thumb,
                  animation: i === 0 ? 'thumb-in 0.4s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                }}
              />
            ))}
            {uploading && <span style={S.uploadDot} />}
          </div>
        )}
        <div style={S.nickName}>{nickname}</div>
        {eventName && <div style={S.captionEvent}>{eventName}</div>}
      </div>

      {/* Gallery overlay */}
      {showGallery && (
        <div style={S.galleryOverlay} onClick={() => setShowGallery(false)}>
          <div style={S.gallerySheet} onClick={e => e.stopPropagation()}>
            <div style={S.galleryHandle} />
            <div style={S.galleryHeader}>
              <span style={S.galleryTitle}>Your shots</span>
              <button style={S.galleryClose} onClick={() => setShowGallery(false)}>
                <CloseIcon />
              </button>
            </div>
            {previews.length === 0 ? (
              <p style={S.galleryEmpty}>No photos yet.</p>
            ) : (
              <div style={S.galleryGrid}>
                {previews.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Photo ${previews.length - i}`}
                    style={S.galleryThumb}
                  />
                ))}
              </div>
            )}
            <div style={S.galleryCount}>
              {photoCount} of {MAX_PHOTOS} frames used
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
      <circle cx="12" cy="13" r="3"/>
      <path d="M6.5 7l1.5-2h2"/>
      <path d="M17 3l1.5 2-1.5 2"/>
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )
}

const S = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100dvh',
    background: '#000',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  scrimTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '100px',
    background: 'linear-gradient(to bottom, rgba(10,10,10,0.75) 0%, transparent 100%)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '220px',
    background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, transparent 100%)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  flashBloom: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,160,35,0.75) 0%, transparent 70%)',
    animation: 'flash-bloom 0.32s ease-out forwards',
    zIndex: 10,
    pointerEvents: 'none',
  },
  eventLabel: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  liveDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--amber)',
    animation: 'pulse-dot 2.4s ease-in-out infinite',
    flexShrink: 0,
  },
  eventLabelText: {
    fontFamily: 'var(--ff-body)',
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  counter: {
    position: 'absolute',
    top: '16px',
    right: '20px',
    zIndex: 10,
    textAlign: 'right',
  },
  counterNum: {
    display: 'block',
    fontFamily: 'var(--ff-display)',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: 'var(--white)',
    lineHeight: 1,
    animation: 'counter-tick 0.35s cubic-bezier(0.16,1,0.3,1)',
  },
  counterOf: {
    display: 'block',
    fontFamily: 'var(--ff-body)',
    fontSize: '11px',
    fontWeight: 400,
    letterSpacing: '0.07em',
    color: 'var(--white-mid)',
    marginTop: '2px',
    textTransform: 'uppercase',
  },
  rail: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    zIndex: 10,
  },
  glyphBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.75)',
    transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), color 0.1s',
  },
  shutterWrap: {
    position: 'absolute',
    bottom: '48px',
    right: '20px',
    zIndex: 10,
  },
  shutter: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  shutterInner: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '2px solid rgba(255,255,255,0.3)',
    pointerEvents: 'none',
  },
  filmFull: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmFullLabel: {
    fontFamily: 'var(--ff-display)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--amber)',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  captionArea: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '110px',
    zIndex: 10,
  },
  thumbStrip: {
    display: 'flex',
    gap: '4px',
    marginBottom: '10px',
    alignItems: 'flex-end',
  },
  thumb: {
    width: '52px',
    height: '52px',
    objectFit: 'cover',
    borderRadius: '7px',
    border: '1.5px solid rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  uploadDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--amber)',
    alignSelf: 'center',
    marginLeft: '4px',
    animation: 'pulse-dot 0.8s ease-in-out infinite',
  },
  nickName: {
    fontFamily: 'var(--ff-body)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--white)',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  captionEvent: {
    fontFamily: 'var(--ff-body)',
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--white-mid)',
    marginTop: '3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  galleryOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'flex-end',
  },
  gallerySheet: {
    width: '100%',
    background: '#111',
    borderRadius: '20px 20px 0 0',
    padding: '12px 20px 40px',
    animation: 'sheet-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
    maxHeight: '80dvh',
    overflowY: 'auto',
  },
  galleryHandle: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.2)',
    margin: '0 auto 16px',
  },
  galleryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  galleryTitle: {
    fontFamily: 'var(--ff-display)',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: 'var(--white)',
  },
  galleryClose: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--white-mid)',
    flexShrink: 0,
  },
  galleryEmpty: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    padding: '32px 0',
    fontSize: '15px',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '3px',
  },
  galleryThumb: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  galleryCount: {
    fontFamily: 'var(--ff-body)',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginTop: '20px',
    letterSpacing: '0.02em',
  },
}
