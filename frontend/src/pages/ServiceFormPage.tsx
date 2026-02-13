import { useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useService, useServicesFlat } from '../hooks/useServices'
import { servicesApi } from '../api/services'
import { Card } from '../components/ui/Card'
import type { ServiceCreate } from '../types'

interface FormData {
  name: string
  description: string
  icon: string
  color: string
  parent_id: string
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

export function ServiceFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!slug

  const { data: service, isLoading: isLoadingService } = useService(slug || '')
  const { data: services = [] } = useServicesFlat()

  const preselectedParentId = searchParams.get('parent_id')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      icon: 'folder',
      color: '#3b82f6',
      parent_id: preselectedParentId || '',
    },
  })

  const selectedColor = watch('color')

  // Populate form when editing
  useEffect(() => {
    if (service && isEditing) {
      reset({
        name: service.name,
        description: service.description || '',
        icon: service.icon,
        color: service.color,
        parent_id: service.parent_id ? String(service.parent_id) : '',
      })
    }
  }, [service, isEditing, reset])

  const createMutation = useMutation({
    mutationFn: (data: ServiceCreate) => servicesApi.create(data),
    onSuccess: (newService) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate(`/service/${newService.slug}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ServiceCreate) => servicesApi.update(service!.id, data),
    onSuccess: (updatedService) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate(`/service/${updatedService.slug}`)
    },
  })

  const onSubmit = (data: FormData) => {
    const payload: ServiceCreate = {
      name: data.name,
      description: data.description || undefined,
      icon: data.icon,
      color: data.color,
      parent_id: data.parent_id ? parseInt(data.parent_id, 10) : null,
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  // Filter out current service and its children from parent options
  const parentOptions = services.filter((s) => {
    if (!isEditing) return true
    return s.id !== service?.id
  })

  if (isEditing && isLoadingService) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
        <Link to="/" className="hover:text-text-primary">Главная</Link>
        <span>/</span>
        <span className="text-text-primary">
          {isEditing ? 'Редактирование сервиса' : 'Новый сервис'}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Редактирование сервиса' : 'Создание сервиса'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {(error as Error).message || 'Произошла ошибка'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="label">Название *</label>
              <input
                {...register('name', { required: 'Обязательное поле' })}
                type="text"
                className="input"
                placeholder="Название сервиса"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="label">Описание</label>
              <textarea
                {...register('description')}
                className="textarea"
                rows={3}
                placeholder="Краткое описание сервиса..."
              />
            </div>

            <div>
              <label className="label">Родительский сервис</label>
              <select {...register('parent_id')} className="input">
                <option value="">Без родителя (корневой)</option>
                {parentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1">
                Выберите родительский сервис для создания иерархии
              </p>
            </div>

            <div>
              <label className="label">Цвет</label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color)}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        selectedColor === color ? 'scale-110 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  {...register('color', {
                    pattern: {
                      value: /^#[0-9a-fA-F]{6}$/,
                      message: 'Используйте формат #RRGGBB',
                    },
                  })}
                  type="text"
                  className="input w-24"
                  placeholder="#3b82f6"
                />
              </div>
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
              )}
            </div>

            {/* Preview */}
            <div>
              <label className="label">Предпросмотр</label>
              <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  📁
                </div>
                <span className="font-medium">{watch('name') || 'Название сервиса'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
          </button>
          <Link to={isEditing ? `/service/${slug}` : '/'} className="btn btn-secondary">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  )
}
