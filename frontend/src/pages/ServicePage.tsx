import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useService } from '../hooks/useServices'
import { useIncidents } from '../hooks/useIncidents'
import { useGuides } from '../hooks/useGuides'
import { useAuthStore } from '../store/authStore'
import { servicesApi } from '../api/services'
import { Card } from '../components/ui/Card'
import { SeverityBadge, GuideTypeBadge } from '../components/ui/Badge'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ServicePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: service, isLoading, error } = useService(slug || '')
  const { data: incidents = [] } = useIncidents(service?.id)
  const { data: guides = [] } = useGuides(service?.id)

  const deleteMutation = useMutation({
    mutationFn: () => servicesApi.delete(service!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate('/')
    },
  })

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот сервис? Все связанные инциденты и гайды также будут удалены.')) {
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

  if (error || !service) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Сервис не найден</h1>
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
        <span className="text-text-primary">{service.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${service.color}20` }}
        >
          📁
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{service.name}</h1>
          {service.description && (
            <p className="text-text-secondary">{service.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              to={`/edit/service/${service.slug}`}
              className="btn btn-secondary btn-sm"
            >
              ✏️ Редактировать
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn btn-secondary btn-sm text-red-500 hover:bg-red-500/10"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link
          to={`/new/incident?service_id=${service.id}`}
          className="btn btn-primary"
        >
          🔥 Новый инцидент
        </Link>
        <Link
          to={`/new/guide?service_id=${service.id}`}
          className="btn btn-secondary"
        >
          📖 Новый гайд
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl">
            🔥
          </div>
          <div>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <div className="text-sm text-text-muted">Инцидентов</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
            📖
          </div>
          <div>
            <div className="text-2xl font-bold">{guides.length}</div>
            <div className="text-sm text-text-muted">Гайдов</div>
          </div>
        </Card>
      </div>

      {/* Incidents */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🔥</span>
          Инциденты
        </h2>
        {incidents.length > 0 ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <Link
                key={incident.id}
                to={`/incident/${incident.slug}`}
                className="block p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center text-xl flex-shrink-0">
                    🔥
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{incident.title}</span>
                      {incident.is_pinned && <span>📌</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                      <SeverityBadge severity={incident.severity} />
                      <span>📅 {formatDate(incident.created_at)}</span>
                      <span>👁 {incident.views}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-6 text-text-muted">
            Нет инцидентов для этого сервиса
          </Card>
        )}
      </div>

      {/* Guides */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📖</span>
          Гайды
        </h2>
        {guides.length > 0 ? (
          <div className="space-y-3">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                to={`/guide/${guide.slug}`}
                className="block p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-xl flex-shrink-0">
                    📖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{guide.title}</span>
                      {guide.is_pinned && <span>📌</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                      <GuideTypeBadge type={guide.guide_type} />
                      <span>📅 {formatDate(guide.created_at)}</span>
                      <span>👁 {guide.views}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-6 text-text-muted">
            Нет гайдов для этого сервиса
          </Card>
        )}
      </div>
    </div>
  )
}
