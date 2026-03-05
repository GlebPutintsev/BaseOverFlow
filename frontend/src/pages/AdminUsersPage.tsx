import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import { Card } from '../components/ui/Card'
import type { UserCreateByAdmin, UserRole } from '../types'
import clsx from 'clsx'

const roleNames: Record<UserRole, string> = {
  admin: 'Администратор',
  reviewer: 'Модератор',
  user: 'Пользователь',
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-500/20 text-red-500',
  reviewer: 'bg-purple-500/20 text-purple-500',
  user: 'bg-green-500/20 text-green-500',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser, isLoading: isAuthLoading } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<UserCreateByAdmin>({
    email: '',
    username: '',
    password: '',
    display_name: '',
    role: 'user',
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => authApi.listUsers(500, 0),
    enabled: !!currentUser && currentUser.role === 'admin',
  })

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.display_name || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const createMutation = useMutation({
    mutationFn: (data: UserCreateByAdmin) => authApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowCreateModal(false)
      setCreateForm({ email: '', username: '', password: '', display_name: '', role: 'user' })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      authApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const blockMutation = useMutation({
    mutationFn: (userId: number) => authApi.blockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const unblockMutation = useMutation({
    mutationFn: (userId: number) => authApi.unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => authApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.username || !createForm.password) return
    createMutation.mutate({
      ...createForm,
      display_name: createForm.display_name || undefined,
    })
  }

  if (!isAuthLoading && (!currentUser || currentUser.role !== 'admin')) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Доступ запрещён</h1>
        <p className="text-text-muted mb-4">Эта страница доступна только для администраторов</p>
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Управление пользователями</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          + Добавить пользователя
        </button>
      </div>

      <Card className="mb-4">
        <input
          type="search"
          placeholder="Поиск по имени, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full max-w-md"
        />
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Загрузка...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {search.trim() ? 'Никого не найдено по запросу' : 'Нет пользователей'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="p-3 font-medium">Пользователь</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Роль</th>
                  <th className="p-3 font-medium">Статус</th>
                  <th className="p-3 font-medium">Дата</th>
                  <th className="p-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-bg-tertiary/50">
                    <td className="p-3">
                      <Link
                        to={`/user/${u.username}`}
                        className="font-medium text-accent-primary hover:underline"
                      >
                        {u.display_name || u.username}
                      </Link>
                      <div className="text-xs text-text-muted">@{u.username}</div>
                    </td>
                    <td className="p-3 text-sm">{u.email}</td>
                    <td className="p-3">
                      {u.id === currentUser?.id ? (
                        <span className={clsx('px-2 py-0.5 rounded text-xs', roleColors[u.role])}>
                          {roleNames[u.role]} (вы)
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className={clsx('px-2 py-0.5 rounded text-xs', roleColors[u.role])}>
                          {roleNames[u.role]}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              userId: u.id,
                              role: e.target.value as UserRole,
                            })
                          }
                          className="text-sm border border-border rounded px-2 py-1 bg-bg-tertiary"
                        >
                          <option value="user">Пользователь</option>
                          <option value="reviewer">Модератор</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      {u.is_active ? (
                        <span className="text-green-500 text-sm">Активен</span>
                      ) : (
                        <span className="text-red-500 text-sm">Заблокирован</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-text-muted">{formatDate(u.created_at)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/user/${u.username}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Профиль
                        </Link>
                        {u.id !== currentUser?.id && u.role !== 'admin' && (
                          <>
                            {u.is_active ? (
                              <button
                                onClick={() => blockMutation.mutate(u.id)}
                                disabled={blockMutation.isPending}
                                className="btn btn-secondary btn-sm text-amber-600 hover:bg-amber-500/20"
                              >
                                Заблокировать
                              </button>
                            ) : (
                              <button
                                onClick={() => unblockMutation.mutate(u.id)}
                                disabled={unblockMutation.isPending}
                                className="btn btn-secondary btn-sm text-green-600"
                              >
                                Разблокировать
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm(`Удалить пользователя ${u.username}? Это действие нельзя отменить.`)) {
                                  deleteMutation.mutate(u.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="btn btn-secondary btn-sm text-red-500 hover:bg-red-500/20"
                            >
                              Удалить
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить пользователя</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Логин *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="input w-full"
                  placeholder="Только латиница, цифры, _"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Пароль *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Отображаемое имя</label>
                <input
                  type="text"
                  value={createForm.display_name || ''}
                  onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Роль</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="input w-full"
                >
                  <option value="user">Пользователь</option>
                  <option value="reviewer">Модератор (ревьюер)</option>
                </select>
              </div>
              {createMutation.isError && (
                <div className="text-sm text-red-500">
                  {(createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                    (createMutation.error as Error).message}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
                  {createMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
