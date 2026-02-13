import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGuide } from '../hooks/useGuides'
import { useAuthStore } from '../store/authStore'
import { guidesApi } from '../api/guides'
import { Card } from '../components/ui/Card'
import { GuideTypeBadge, PublishStatusBadge, Badge } from '../components/ui/Badge'
import { VoteButtons } from '../components/ui/VoteButtons'
import { MarkdownContent } from '../components/MarkdownContent'
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

export function GuidePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: guide, isLoading, error } = useGuide(slug || '')

  const deleteMutation = useMutation({
    mutationFn: () => guidesApi.delete(guide!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] })
      navigate('/')
    },
  })

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот гайд?')) {
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

  if (error || !guide) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Гайд не найден</h1>
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
        {guide.service && (
          <>
            <Link to={`/service/${guide.service.slug}`} className="hover:text-text-primary">
              {guide.service.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-text-primary">Гайд</span>
      </div>

      <div className="flex gap-6">
        {/* Vote buttons */}
        <div className="flex-shrink-0">
          <VoteButtons
            targetType="guide"
            targetId={guide.id}
            initialScore={guide.score}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                📖
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{guide.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <GuideTypeBadge type={guide.guide_type} />
                  <PublishStatusBadge status={guide.publish_status} />
                  {guide.is_pinned && (
                    <Badge color="#8b5cf6">📌 Закреплено</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            {guide.summary && (
              <p className="text-text-secondary text-lg mb-4">{guide.summary}</p>
            )}

            {/* Meta */}
            <Card className="flex flex-wrap gap-4 text-sm">
              {guide.service && (
                <div>
                  <span className="text-text-muted">Сервис:</span>{' '}
                  <Link
                    to={`/service/${guide.service.slug}`}
                    className="text-accent-primary hover:underline"
                  >
                    {guide.service.name}
                  </Link>
                </div>
              )}
              {guide.author_username && (
                <div>
                  <span className="text-text-muted">Автор:</span>{' '}
                  <Link to={`/user/${guide.author_username}`} className="text-accent-primary hover:underline">
                    {guide.author || guide.author_username}
                  </Link>
                </div>
              )}
              <div>
                <span className="text-text-muted">Создано:</span> {formatDate(guide.created_at)}
              </div>
              <div>
                <span className="text-text-muted">Обновлено:</span> {formatDate(guide.updated_at)}
              </div>
              <div>
                <span className="text-text-muted">Просмотры:</span> {guide.views}
              </div>
            </Card>

            {/* Tags */}
            {guide.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {guide.tags.map((tag) => (
                  <Badge key={tag.id} color={tag.color}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <Card>
            <MarkdownContent content={guide.content} />
          </Card>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-3 pt-4 mt-4 border-t border-border">
              <Link
                to={`/edit/guide/${guide.slug}`}
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
          <Comments guideId={guide.id} />
        </div>
      </div>
    </div>
  )
}
