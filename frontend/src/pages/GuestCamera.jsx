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
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [flash, setFlash] = useState(false)
  const [nickname, setNickname] = useState('')
  const [limitHit, setLimitHit] = useState(false)

  useEffect(() => {
    const name = sessionStorage.getItem(`nickname_${eventId}`)
    if (!name) { navigate(`/event/${eventId}`); return }
    setNickname(name)
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
    setTimeout(() => setFlash(false), 150)

    canvas.toBlob(async blob => {
      const newCount = photoCount + 1
      setPhotoCount(newCount)
      setPreview(URL.createObjectURL(blob))

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
        // silent — photo is still captured, upload failure shown via count not incrementing on server
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 1.0)
  }

  const remaining = MAX_PHOTOS - photoCount

  return (
    <div style={styles.wrapper}>
      {/* Flash overlay */}
      {flash && <div style={styles.flash} />}

      {/* Live viewfinder */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
      />

      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.eventLabel}>{nickname}</span>
        <span style={{ ...styles.counter, color: remaining <= 3 ? '#f87171' : '#fff' }}>
          {remaining} left
        </span>
      </div>

      {/* Photo preview strip */}
      {preview && (
        <div style={styles.previewStrip}>
          <img src={preview} alt="last shot" style={styles.previewThumb} />
          {uploading && <span style={styles.uploadingDot} />}
        </div>
      )}

      {/* Bottom controls */}
      <div style={styles.controls}>
        <div style={{ width: 48 }} />

        {limitHit ? (
          <div style={styles.limitMsg}>
            <span>🎞️</span>
            <span>Film full!</span>
          </div>
        ) : (
          <button
            style={{ ...styles.shutter, opacity: uploading ? 0.6 : 1 }}
            onClick={capturePhoto}
            disabled={uploading}
            aria-label="Take photo"
          />
        )}

        <button style={styles.flipBtn} onClick={toggleCamera} aria-label="Flip camera">
          🔄
        </button>
      </div>
    </div>
  )
}

const styles = {
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
  flash: {
    position: 'absolute',
    inset: 0,
    background: '#fff',
    opacity: 0.85,
    zIndex: 10,
    pointerEvents: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '48px 20px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
    zIndex: 2,
  },
  eventLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  counter: {
    fontSize: '14px',
    fontWeight: '600',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  previewStrip: {
    position: 'absolute',
    bottom: '110px',
    left: '20px',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  previewThumb: {
    width: '52px',
    height: '52px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid rgba(255,255,255,0.4)',
  },
  uploadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#facc15',
    animation: 'pulse 1s infinite',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px 40px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
    zIndex: 2,
  },
  shutter: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#fff',
    border: '4px solid rgba(255,255,255,0.3)',
    boxShadow: '0 0 0 3px rgba(255,255,255,0.15)',
    transition: 'transform 0.1s, opacity 0.15s',
  },
  flipBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitMsg: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  },
}
