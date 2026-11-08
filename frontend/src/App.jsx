import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NicknameEntry from './pages/NicknameEntry.jsx'
import GuestCamera from './pages/GuestCamera.jsx'
import OrganizerDashboard from './pages/OrganizerDashboard.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/event/:eventId" element={<NicknameEntry />} />
        <Route path="/event/:eventId/camera" element={<GuestCamera />} />
        <Route path="/organizer" element={<OrganizerDashboard />} />
        <Route path="*" element={<Navigate to="/organizer" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
