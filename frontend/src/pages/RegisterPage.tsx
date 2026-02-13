import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'

interface RegisterForm {
  email: string
  username: string
  password: string
  password_confirm: string
  display_name?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    setIsLoading(true)
    try {
      await registerUser(data.email, data.username, data.password, data.display_name)
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Ошибка регистрации')
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
          <h1 className="text-xl font-bold mb-6 text-center">Регистрация</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email', {
                  required: 'Обязательное поле',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Некорректный email',
                  },
                })}
                type="email"
                className="input"
                placeholder="user@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Имя пользователя</label>
              <input
                {...register('username', {
                  required: 'Обязательное поле',
                  minLength: { value: 3, message: 'Минимум 3 символа' },
                  maxLength: { value: 50, message: 'Максимум 50 символов' },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Только латинские буквы, цифры и _',
                  },
                })}
                type="text"
                className="input"
                placeholder="username"
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="label">Отображаемое имя (необязательно)</label>
              <input
                {...register('display_name', {
                  maxLength: { value: 100, message: 'Максимум 100 символов' },
                })}
                type="text"
                className="input"
                placeholder="Иван Иванов"
              />
              {errors.display_name && (
                <p className="text-red-500 text-sm mt-1">{errors.display_name.message}</p>
              )}
            </div>

            <div>
              <label className="label">Пароль</label>
              <input
                {...register('password', {
                  required: 'Обязательное поле',
                  minLength: { value: 6, message: 'Минимум 6 символов' },
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Подтверждение пароля</label>
              <input
                {...register('password_confirm', {
                  required: 'Обязательное поле',
                  validate: (value) => value === password || 'Пароли не совпадают',
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password_confirm && (
                <p className="text-red-500 text-sm mt-1">{errors.password_confirm.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-text-muted">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-accent-primary hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
