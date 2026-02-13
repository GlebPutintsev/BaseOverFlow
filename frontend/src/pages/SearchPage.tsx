import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api/search'
import { useServicesFlat } from '../hooks/useServices'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [serviceFilter, setServiceFilter] = useState(searchParams.get('service_id') || '')

  const { data: services = [] } = useServicesFlat()

  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (typeFilter) params.set('type', typeFilter)
    if (serviceFilter) params.set('service_id', serviceFilter)
    setSearchParams(params, { replace: true })
  }, [query, typeFilter, serviceFilter, setSearchParams])

  const { data: searchResults, isLoading, isFetching } = useQuery({
    queryKey: ['search', query, typeFilter, serviceFilter],
    queryFn: () =>
      searchApi.search({
        q: query,
        type: typeFilter as 'incident' | 'guide' | undefined,
        service_id: serviceFilter ? parseInt(serviceFilter, 10) : undefined,
      }),
    enabled: query.length > 0,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Поиск</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-12"
              placeholder="Введите поисковый запрос..."
              autoFocus
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div>
            <label className="text-sm text-text-muted mb-1 block">Тип</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input py-1.5"
            >
              <option value="">Все типы</option>
              <option value="incident">Инциденты</option>
              <option value="guide">Гайды</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1 block">Сервис</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="input py-1.5"
            >
              <option value="">Все сервисы</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {(typeFilter || serviceFilter) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('')
                  setServiceFilter('')
                }}
                className="btn btn-secondary btn-sm"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Results */}
      {!query ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-lg font-medium mb-1">Начните поиск</div>
          <p className="text-text-muted">
            Введите запрос для поиска по инцидентам и гайдам
          </p>
        </Card>
      ) : isLoading || isFetching ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-text-muted">Поиск...</div>
        </Card>
      ) : searchResults && searchResults.results.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-text-muted">
              Найдено: <span className="text-text-primary font-medium">{searchResults.total}</span> результатов
              <span className="text-xs ml-2">({searchResults.took_ms.toFixed(0)} мс)</span>
            </p>
          </div>

          <div className="space-y-3">
            {searchResults.results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={`/${result.type}/${result.slug}`}
                className="block p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                      result.type === 'incident' ? 'bg-red-500/15' : 'bg-blue-500/15'
                    }`}
                  >
                    {result.type === 'incident' ? '🔥' : '📖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.title}</span>
                      <Badge
                        color={result.type === 'incident' ? '#ef4444' : '#3b82f6'}
                      >
                        {result.type === 'incident' ? 'Инцидент' : 'Гайд'}
                      </Badge>
                    </div>
                    <p
                      className="text-sm text-text-secondary mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                    <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
                      <Link
                        to={`/service/${result.service_slug}`}
                        className="hover:text-accent-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📁 {result.service_name}
                      </Link>
                      <span>📅 {formatDate(result.created_at)}</span>
                    </div>
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {result.tags.map((tag) => (
                          <Badge key={tag.id} color={tag.color}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-lg font-medium mb-1">Ничего не найдено</div>
          <p className="text-text-muted">
            Попробуйте изменить запрос или снять фильтры
          </p>
        </Card>
      )}

      {/* Keyboard shortcut hint */}
      <div className="mt-8 text-center text-sm text-text-muted">
        Совет: используйте <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded border border-border">⌘K</kbd> для быстрого доступа к поиску с любой страницы
      </div>
    </div>
  )
}
