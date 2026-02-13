import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <div className="text-8xl mb-6">😕</div>
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl text-text-muted mb-8">
        Страница не найдена
      </p>
      <div className="flex gap-4 justify-center">
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
        <Link to="/search" className="btn btn-secondary">
          Поиск
        </Link>
      </div>
    </div>
  )
}
