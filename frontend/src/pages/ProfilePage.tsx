import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { UserUpdate } from '../types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser, checkAuth } = useAuthStore()
  const isOwnProfile = currentUser?.username === username

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserUpdate>({})
  const [isSaving, setIsSaving] = useState(false)

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => authApi.getProfile(username!),
    enabled: !!username,
  })

  useEffect(() => {
    if (profile && isOwnProfile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        position: profile.position || '',
        skills: profile.skills || '',
      })
    }
  }, [profile, isOwnProfile])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await authApi.updateProfile(formData)
      await checkAuth() // Refresh user data
      await refetch()
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <div className="text-text-muted">Загрузка...</div>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-lg font-medium mb-1">Пользователь не найден</div>
          <Link to="/" className="btn btn-primary mt-4">
            На главную
          </Link>
        </Card>
      </div>
    )
  }

  const roleColors = {
    admin: '#ef4444',
    reviewer: '#a855f7',
    user: '#22c55e',
  }

  const roleNames = {
    admin: 'Администратор',
    reviewer: 'Модератор',
    user: 'Пользователь',
  }

  const skillsList = profile.skills?.split(',').map(s => s.trim()).filter(Boolean) || []

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-3xl text-white font-bold">
            {(profile.display_name || profile.username)[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
              <Badge color={roleColors[profile.role]}>{roleNames[profile.role]}</Badge>
            </div>
            <div className="text-text-muted">@{profile.username}</div>
            <div className="text-sm text-text-muted mt-1">
              На платформе с {formatDate(profile.created_at)}
            </div>
          </div>
          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm"
            >
              ✏️ Редактировать
            </button>
          )}
        </div>

        {isEditing ? (
          /* Edit form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Отображаемое имя</label>
              <input
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="input"
                placeholder="Как вас называть"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Должность</label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="input"
                placeholder="Например: Senior Backend Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">О себе</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="textarea"
                rows={4}
                placeholder="Расскажите о себе..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Навыки и технологии</label>
              <input
                type="text"
                value={formData.skills || ''}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="input"
                placeholder="Python, PostgreSQL, Docker (через запятую)"
              />
              <p className="text-xs text-text-muted mt-1">Укажите через запятую</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="space-y-4">
            {profile.position && (
              <div>
                <div className="text-sm text-text-muted mb-1">Должность</div>
                <div className="font-medium">{profile.position}</div>
              </div>
            )}

            {profile.bio && (
              <div>
                <div className="text-sm text-text-muted mb-1">О себе</div>
                <div className="whitespace-pre-wrap">{profile.bio}</div>
              </div>
            )}

            {skillsList.length > 0 && (
              <div>
                <div className="text-sm text-text-muted mb-2">Навыки</div>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!profile.position && !profile.bio && skillsList.length === 0 && (
              <div className="text-text-muted text-center py-4">
                {isOwnProfile ? (
                  <>
                    Профиль не заполнен.{' '}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-accent-primary hover:underline"
                    >
                      Заполнить сейчас
                    </button>
                  </>
                ) : (
                  'Пользователь пока не заполнил профиль'
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
