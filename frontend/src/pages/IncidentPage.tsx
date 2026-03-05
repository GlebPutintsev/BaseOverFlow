import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIncident } from '../hooks/useIncidents'
import { useAuthStore } from '../store/authStore'
import { incidentsApi } from '../api/incidents'
import { Card } from '../components/ui/Card'
import { SeverityBadge, PublishStatusBadge } from '../components/ui/Badge'
import { VoteButtons } from '../components/ui/VoteButtons'
import { MarkdownContent } from '../components/MarkdownContent'
import { Badge } from '../components/ui/Badge'
import { Comments } from '../components/Comments'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IncidentPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: incident, isLoading, error } = useIncident(slug || '')

  const deleteMutation = useMutation({
    mutationFn: () => incidentsApi.delete(incident!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      navigate('/')
    },
  })

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот инцидент?')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Загрузка...</div>
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Инцидент не найден</h1>
        <p className="text-text-muted mb-4">Возможно, он был удалён или перемещён</p>
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </div>
    )
  }

  const canEdit = user && (user.role === 'admin' || user.role === 'reviewer')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
        <Link to="/" className="hover:text-text-primary">Главная</Link>
        <span>/</span>
        {incident.service && (
          <>
            <Link to={`/service/${incident.service.slug}`} className="hover:text-text-primary">
              {incident.service.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-text-primary">Инцидент</span>
      </div>

      <div className="flex gap-6">
        {/* Vote buttons */}
        <div className="flex-shrink-0">
          <VoteButtons
            targetType="incident"
            targetId={incident.id}
            initialScore={incident.score}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                🔥
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{incident.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <SeverityBadge severity={incident.severity} />
                  <PublishStatusBadge status={incident.publish_status} />
                  {incident.is_pinned && (
                    <Badge color="#8b5cf6">📌 Закреплено</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Meta */}
            <Card className="flex flex-wrap gap-4 text-sm">
              {incident.service && (
                <div>
                  <span className="text-text-muted">Сервис:</span>{' '}
                  <Link
                    to={`/service/${incident.service.slug}`}
                    className="text-accent-primary hover:underline"
                  >
                    {incident.service.name}
                  </Link>
                </div>
              )}
              {incident.author_username && (
                <div>
                  <span className="text-text-muted">Автор:</span>{' '}
                  <Link to={`/user/${incident.author_username}`} className="text-accent-primary hover:underline">
                    {incident.author || incident.author_username}
                  </Link>
                </div>
              )}
              <div>
                <span className="text-text-muted">Создано:</span> {formatDate(incident.created_at)}
              </div>
              {incident.incident_date && (
                <div>
                  <span className="text-text-muted">Дата инцидента:</span> {formatDate(incident.incident_date)}
                </div>
              )}
              <div>
                <span className="text-text-muted">Просмотры:</span> {incident.views}
              </div>
            </Card>

            {/* Tags */}
            {incident.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {incident.tags.map((tag) => (
                  <Badge key={tag.id} color={tag.color}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          {incident.image_url && (
            <div
              className="relative mb-4 rounded-xl overflow-hidden border border-border max-w-3xl"
              style={{ height: '300px' }}
            >
              <img
                src={incident.image_url}
                alt={incident.title}
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: 'cover',
                  objectPosition: incident.image_position
                    ? `${incident.image_position.split(' ')[0]}% ${incident.image_position.split(' ')[1]}%`
                    : '50% 50%',
                }}
              />
            </div>
          )}

          {/* Description */}
          <Card className="mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📋</span>
              Описание проблемы
            </h2>
            <MarkdownContent content={incident.description} />
          </Card>

          {/* Error message */}
          {incident.error_message && (
            <Card className="mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>❌</span>
                Сообщение об ошибке
              </h2>
              <pre className="bg-bg-tertiary p-4 rounded-lg overflow-x-auto text-sm font-mono text-red-400">
                {incident.error_message}
              </pre>
            </Card>
          )}

          {/* Stack trace */}
          {incident.stack_trace && (
            <Card className="mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📜</span>
                Stack trace
              </h2>
              <pre className="bg-bg-tertiary p-4 rounded-lg overflow-x-auto text-sm font-mono text-text-muted max-h-96">
                {incident.stack_trace}
              </pre>
            </Card>
          )}

          {/* Root cause */}
          {incident.root_cause && (
            <Card className="mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🔍</span>
                Причина
              </h2>
              <MarkdownContent content={incident.root_cause} />
            </Card>
          )}

          {/* Solution */}
          <Card className="mb-4 border-green-500/30 bg-green-500/5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-500">
              <span>✅</span>
              Решение
            </h2>
            <MarkdownContent content={incident.solution} />
          </Card>

          {/* Prevention */}
          {incident.prevention && (
            <Card className="mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🛡️</span>
                Как предотвратить
              </h2>
              <MarkdownContent content={incident.prevention} />
            </Card>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Link
                to={`/edit/incident/${incident.slug}`}
                className="btn btn-secondary"
              >
                ✏️ Редактировать
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="btn btn-secondary text-red-500 hover:bg-red-500/10"
              >
                🗑️ Удалить
              </button>
            </div>
          )}

          {/* Comments */}
          <Comments incidentId={incident.id} />
        </div>
      </div>
    </div>
  )
}
