import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'

interface LoginForm {
  email_or_username: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setIsLoading(true)
    try {
      await login(data.email_or_username, data.password)
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl">
            📚
          </div>
          <span className="font-bold text-2xl">BaseOverflow</span>
        </Link>

        {/* Form */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-6 text-center">Вход в аккаунт</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email или имя пользователя</label>
              <input
                {...register('email_or_username', { required: 'Обязательное поле' })}
                type="text"
                className="input"
                placeholder="user@example.com"
              />
              {errors.email_or_username && (
                <p className="text-red-500 text-sm mt-1">{errors.email_or_username.message}</p>
              )}
            </div>

            <div>
              <label className="label">Пароль</label>
              <input
                {...register('password', { required: 'Обязательное поле' })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-text-muted">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-accent-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
