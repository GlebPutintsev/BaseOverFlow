import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStats } from '../hooks/useStats'
import { useRecentIncidents, usePinnedIncidents, useTopRatedIncidents, usePopularIncidents } from '../hooks/useIncidents'
import { useRecentGuides, usePinnedGuides, useTopRatedGuides } from '../hooks/useGuides'
import { Card } from '../components/ui/Card'
import { SeverityBadge, GuideTypeBadge } from '../components/ui/Badge'
import type { Incident, Guide } from '../types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface ItemCardProps {
  type: 'incident' | 'guide'
  item: Incident | Guide
  showScore?: boolean
}

function ItemCard({ type, item, showScore }: ItemCardProps) {
  const isIncident = type === 'incident'
  const incident = isIncident ? (item as Incident) : null
  const guide = !isIncident ? (item as Guide) : null

  return (
    <div className="flex items-start gap-3 p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-primary/50 transition-colors">
      {showScore && (
        <div className="flex flex-col items-center justify-center min-w-[50px] p-2 bg-bg-tertiary rounded-lg">
          <span className={`text-lg font-bold ${item.score > 0 ? 'text-green-500' : 'text-text-muted'}`}>
            {item.score}
          </span>
          <span className="text-[10px] uppercase text-text-muted">рейтинг</span>
        </div>
      )}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
        isIncident ? 'bg-red-500/15' : 'bg-blue-500/15'
      }`}>
        {isIncident ? '🔥' : '📖'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/${type}/${item.slug}`}
            className="font-medium hover:text-accent-primary truncate"
          >
            {item.title}
          </Link>
          {item.is_pinned && <span title="Закреплено">📌</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
          {isIncident && incident && <SeverityBadge severity={incident.severity} />}
          {!isIncident && guide && <GuideTypeBadge type={guide.guide_type} />}
          {item.service && (
            <span className="flex items-center gap-1">
              📁 {item.service.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            📅 {formatDate(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface PinnedCardProps {
  type: 'incident' | 'guide'
  item: Incident | Guide
}

function PinnedCard({ type, item }: PinnedCardProps) {
  const isIncident = type === 'incident'
  const incident = isIncident ? (item as Incident) : null
  const guide = !isIncident ? (item as Guide) : null

  return (
    <Link
      to={`/${type}/${item.slug}`}
      className={`flex items-start gap-3 p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-primary hover:-translate-y-0.5 transition-all shadow-lg`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
        isIncident ? 'bg-red-500/15' : 'bg-blue-500/15'
      }`}>
        {isIncident ? '🔥' : '📖'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold line-clamp-2">{item.title}</div>
        <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
          {isIncident && incident && <SeverityBadge severity={incident.severity} />}
          {!isIncident && guide && <GuideTypeBadge type={guide.guide_type} />}
          {item.service && <span>📁 {item.service.name}</span>}
        </div>
      </div>
    </Link>
  )
}

export function HomePage() {
  const { data: stats } = useStats()
  const { data: recentIncidents = [] } = useRecentIncidents(10)
  const { data: recentGuides = [] } = useRecentGuides(10)
  const { data: pinnedIncidents = [] } = usePinnedIncidents()
  const { data: pinnedGuides = [] } = usePinnedGuides()
  const { data: topIncidents = [] } = useTopRatedIncidents(5)
  const { data: topGuides = [] } = useTopRatedGuides(5)
  const { data: popularIncidents = [] } = usePopularIncidents(5)

  // Stats from API
  const totalIncidents = stats?.total_incidents ?? 0
  const totalGuides = stats?.total_guides ?? 0
  const totalServices = stats?.total_services ?? 0

  // Combine and sort recent items
  const recentItems = useMemo(() => {
    const items: Array<{ type: 'incident' | 'guide'; item: Incident | Guide; date: string }> = []
    recentIncidents.forEach((inc) => items.push({ type: 'incident', item: inc, date: inc.created_at }))
    recentGuides.forEach((guide) => items.push({ type: 'guide', item: guide, date: guide.created_at }))
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items.slice(0, 10)
  }, [recentIncidents, recentGuides])

  // Combine and sort top rated items
  const topRatedItems = useMemo(() => {
    const items: Array<{ type: 'incident' | 'guide'; item: Incident | Guide; score: number }> = []
    topIncidents.forEach((inc) => items.push({ type: 'incident', item: inc, score: inc.score }))
    topGuides.forEach((guide) => items.push({ type: 'guide', item: guide, score: guide.score }))
    items.sort((a, b) => b.score - a.score)
    return items.slice(0, 10)
  }, [topIncidents, topGuides])

  const hasPinned = pinnedIncidents.length > 0 || pinnedGuides.length > 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">База знаний команды</h1>
        <p className="text-text-muted">Инциденты, решения и документация в одном месте</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">
            🔥
          </div>
          <div>
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <div className="text-sm text-text-muted">Инцидентов</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
            📖
          </div>
          <div>
            <div className="text-2xl font-bold">{totalGuides}</div>
            <div className="text-sm text-text-muted">Гайдов</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
            📁
          </div>
          <div>
            <div className="text-2xl font-bold">{totalServices}</div>
            <div className="text-sm text-text-muted">Сервисов</div>
          </div>
        </Card>
      </div>

      {/* Pinned Section */}
      {hasPinned && (
        <div className="mb-8 p-6 bg-gradient-to-br from-purple-500/10 to-accent-primary/5 border border-purple-500/20 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📌</span>
            Закреплённое
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedIncidents.map((inc) => (
              <PinnedCard key={`incident-${inc.id}`} type="incident" item={inc} />
            ))}
            {pinnedGuides.map((guide) => (
              <PinnedCard key={`guide-${guide.id}`} type="guide" item={guide} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🕐</span>
          Недавно добавленные
        </h2>
        <div className="space-y-3">
          {recentItems.length > 0 ? (
            recentItems.map((entry) => (
              <ItemCard
                key={`${entry.type}-${entry.item.id}`}
                type={entry.type}
                item={entry.item}
              />
            ))
          ) : (
            <Card className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <div className="font-medium">Нет записей</div>
              <p className="text-sm text-text-muted">Создайте первый инцидент или гайд</p>
            </Card>
          )}
        </div>
      </div>

      {/* Top Rated */}
      {topRatedItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏆</span>
            Лучшее по рейтингу
          </h2>
          <div className="space-y-3">
            {topRatedItems.map((entry) => (
              <ItemCard
                key={`${entry.type}-${entry.item.id}`}
                type={entry.type}
                item={entry.item}
                showScore
              />
            ))}
          </div>
        </div>
      )}

      {/* Popular by views */}
      {popularIncidents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👁</span>
            Популярное по просмотрам
          </h2>
          <div className="space-y-3">
            {popularIncidents.map((incident) => (
              <div key={incident.id} className="flex items-start gap-3 p-4 bg-bg-secondary border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center text-xl flex-shrink-0">
                  🔥
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/incident/${incident.slug}`}
                    className="font-medium hover:text-accent-primary"
                  >
                    {incident.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                    <SeverityBadge severity={incident.severity} />
                    {incident.service && <span>📁 {incident.service.name}</span>}
                    <span>👁 {incident.views} просмотров</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
