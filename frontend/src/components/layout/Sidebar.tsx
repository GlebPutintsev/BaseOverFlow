import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useServices } from '../../hooks/useServices'
import type { ServiceTree } from '../../types'
import clsx from 'clsx'

function ServiceTreeItem({ service, level = 0 }: { service: ServiceTree; level?: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const isActive = location.pathname === `/service/${service.slug}`
  const hasChildren = service.children && service.children.length > 0

  return (
    <div className="nav-tree-item" style={{ marginLeft: level > 0 ? level * 12 : 0 }}>
      <Link
        to={`/service/${service.slug}`}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-accent-primary/20 text-accent-primary'
            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setCollapsed(!collapsed)
            }}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            {collapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: service.color }}
          />
        )}
        <span className="flex-1 truncate">{service.name}</span>
        <span className="text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
          {service.incidents_count + service.guides_count}
        </span>
      </Link>
      {hasChildren && !collapsed && (
        <div className="nav-tree-children">
          {service.children.map((child) => (
            <ServiceTreeItem key={child.id} service={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const { data: services = [], isLoading } = useServices()

  return (
    <aside className="w-64 h-screen bg-bg-secondary border-r border-border flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-xl">
            📚
          </div>
          <span className="font-bold text-lg">BaseOverflow</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {/* Main navigation */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Навигация
          </div>
          <Link
            to="/"
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname === '/'
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            <span>🏠</span>
            <span>Главная</span>
          </Link>
          <Link
            to="/search"
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname === '/search'
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            <span>🔍</span>
            <span>Поиск</span>
          </Link>
        </div>

        {/* Services */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            <span>Сервисы</span>
            <Link
              to="/new/service"
              className="text-accent-primary hover:text-accent-secondary text-base"
              title="Добавить сервис"
            >
              +
            </Link>
          </div>
          {isLoading ? (
            <div className="text-sm text-text-muted px-3 py-2">Загрузка...</div>
          ) : services.length > 0 ? (
            services.map((service) => (
              <ServiceTreeItem key={service.id} service={service} />
            ))
          ) : (
            <Link
              to="/new/service"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-tertiary"
            >
              <span>+</span>
              <span>Добавить сервис</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Footer with action buttons */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Link
            to="/new/incident"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
          >
            <span>🔥</span>
            <span>Инцидент</span>
          </Link>
          <Link
            to="/new/guide"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90 transition-opacity"
          >
            <span>📖</span>
            <span>Гайд</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
