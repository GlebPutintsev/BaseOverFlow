import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { ServicePage } from './pages/ServicePage'
import { ServiceFormPage } from './pages/ServiceFormPage'
import { IncidentPage } from './pages/IncidentPage'
import { IncidentFormPage } from './pages/IncidentFormPage'
import { GuidePage } from './pages/GuidePage'
import { GuideFormPage } from './pages/GuideFormPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ModerationPage } from './pages/ModerationPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/service/:slug" element={<ServicePage />} />
        <Route path="/new/service" element={<ServiceFormPage />} />
        <Route path="/edit/service/:slug" element={<ServiceFormPage />} />
        <Route path="/incident/:slug" element={<IncidentPage />} />
        <Route path="/new/incident" element={<IncidentFormPage />} />
        <Route path="/edit/incident/:slug" element={<IncidentFormPage />} />
        <Route path="/guide/:slug" element={<GuidePage />} />
        <Route path="/new/guide" element={<GuideFormPage />} />
        <Route path="/edit/guide/:slug" element={<GuideFormPage />} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/user/:username" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
