import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { moderationApi } from '../api/moderation'
import { Card } from '../components/ui/Card'
import { PublishStatusBadge } from '../components/ui/Badge'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ModerationPage() {
  const queryClient = useQueryClient()
  const { user, isLoading: isAuthLoading } = useAuthStore()
  const [rejectingItem, setRejectingItem] = useState<{ type: string; id: number } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['moderation', 'pending'],
    queryFn: () => moderationApi.getPending(),
    enabled: !!user && (user.role === 'reviewer' || user.role === 'admin'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ type, id }: { type: 'incident' | 'guide'; id: number }) =>
      moderationApi.approve(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ type, id, reason }: { type: 'incident' | 'guide'; id: number; reason?: string }) =>
      moderationApi.reject(type, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] })
      setRejectingItem(null)
      setRejectReason('')
    },
  })

  const handleApprove = (type: 'incident' | 'guide', id: number) => {
    approveMutation.mutate({ type, id })
  }

  const handleReject = () => {
    if (rejectingItem) {
      rejectMutation.mutate({
        type: rejectingItem.type as 'incident' | 'guide',
        id: rejectingItem.id,
        reason: rejectReason || undefined,
      })
    }
  }

  if (!isAuthLoading && (!user || (user.role !== 'reviewer' && user.role !== 'admin'))) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Доступ запрещён</h1>
        <p className="text-text-muted mb-4">
          Эта страница доступна только для ревьюеров и администраторов
        </p>
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </div>
    )
  }

  const items = data?.items || []

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Модерация</h1>

      {/* Stats */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
            ⏳
          </div>
          <div>
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-sm text-text-muted">Ожидает проверки</div>
          </div>
        </div>
      </Card>

      {/* Items list */}
      {isLoading ? (
        <Card className="text-center py-12">
          <div className="text-text-muted">Загрузка...</div>
        </Card>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                    item.type === 'incident' ? 'bg-red-500/15' : 'bg-blue-500/15'
                  }`}
                >
                  {item.type === 'incident' ? '🔥' : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/${item.type}/${item.slug}`}
                      className="font-semibold hover:text-accent-primary"
                    >
                      {item.title}
                    </Link>
                    <PublishStatusBadge status={item.publish_status} />
                  </div>
                  <div className="text-sm text-text-muted">
                    {item.author && <span>Автор: {item.author} · </span>}
                    <span>Сервис: {item.service_name} · </span>
                    <span>Создано: {formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.type as 'incident' | 'guide', item.id)}
                    disabled={approveMutation.isPending}
                    className="btn btn-sm bg-green-500/20 text-green-500 hover:bg-green-500/30"
                  >
                    ✓ Одобрить
                  </button>
                  <button
                    onClick={() => setRejectingItem({ type: item.type, id: item.id })}
                    className="btn btn-sm bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  >
                    ✕ Отклонить
                  </button>
                  <Link
                    to={`/${item.type}/${item.slug}`}
                    className="btn btn-secondary btn-sm"
                  >
                    👁 Просмотр
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">✨</div>
          <div className="text-lg font-medium mb-1">Всё проверено!</div>
          <p className="text-text-muted">
            Нет материалов, ожидающих модерации
          </p>
        </Card>
      )}

      {/* Reject modal */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="textarea mb-4"
              rows={3}
              placeholder="Укажите причину (необязательно)..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectingItem(null)
                  setRejectReason('')
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="btn bg-red-500 text-white hover:bg-red-600"
              >
                Отклонить
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
