import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { notificationsApi } from '../../api/notifications'
import type { Notification } from '../../types'
import clsx from 'clsx'

export function Header() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, checkAuth, isLoading } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      const [notifs, countData] = await Promise.all([
        notificationsApi.getAll(10),
        notificationsApi.getCount(),
      ])
      setNotifications(notifs)
      setUnreadCount(countData.unread_count)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
    navigate('/')
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    loadNotifications()
  }

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await notificationsApi.markRead(notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
    }
    setShowNotifications(false)
    loadNotifications()
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        navigate('/search')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const isReviewerOrAdmin = user && (user.role === 'reviewer' || user.role === 'admin')

  return (
    <header className="h-16 bg-bg-secondary border-b border-border px-6 flex items-center gap-4">
      {/* Search box */}
      <div
        onClick={() => navigate('/search')}
        className="flex-1 max-w-2xl flex items-center gap-3 px-4 py-2 bg-bg-tertiary border border-border rounded-lg cursor-pointer hover:border-accent-primary/50 transition-colors"
      >
        <span className="text-text-muted">🔍</span>
        <span className="flex-1 text-text-muted">Поиск по базе знаний...</span>
        <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded border border-border">
          ⌘K
        </span>
      </div>

      {/* User area */}
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="text-sm text-text-muted">Загрузка...</div>
        ) : isAuthenticated && user ? (
          <>
            {/* Notifications for all users */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-bg-tertiary hover:bg-border transition-colors"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-bg-secondary border border-border rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="font-semibold">Уведомления</span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-sm text-accent-primary hover:underline"
                    >
                      Прочитать все
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={clsx(
                            'p-3 border-b border-border cursor-pointer hover:bg-bg-tertiary',
                            !notif.is_read && 'bg-accent-primary/10'
                          )}
                        >
                          <div className="font-medium text-sm">{notif.title}</div>
                          {notif.message && (
                            <div className="text-xs text-text-muted mt-1 whitespace-pre-wrap">{notif.message}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-text-muted">
                        Нет уведомлений
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg hover:border-accent-primary/50 transition-colors"
              >
                <span>{user.display_name || user.username}</span>
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 p-2">
                  <div
                    className={clsx(
                      'text-xs font-semibold text-center py-1 px-2 rounded mb-2 uppercase',
                      user.role === 'admin' && 'bg-red-500/20 text-red-500',
                      user.role === 'reviewer' && 'bg-purple-500/20 text-purple-500',
                      user.role === 'user' && 'bg-green-500/20 text-green-500'
                    )}
                  >
                    {user.role}
                  </div>
                  <Link
                    to={`/user/${user.username}`}
                    className="block px-3 py-2 rounded-lg text-sm hover:bg-bg-tertiary"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 Профиль
                  </Link>
                  {isReviewerOrAdmin && (
                    <Link
                      to="/moderation"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-bg-tertiary"
                      onClick={() => setShowUserMenu(false)}
                    >
                      📋 Модерация
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-bg-tertiary"
                  >
                    🚪 Выйти
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-secondary btn-sm">
              Войти
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Регистрация
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
