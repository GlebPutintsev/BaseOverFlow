import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIncident } from '../hooks/useIncidents'
import { useServicesFlatWithDepth } from '../hooks/useServices'
import { useTags } from '../hooks/useTags'
import { useAuthStore } from '../store/authStore'
import { incidentsApi } from '../api/incidents'
import { uploadsApi } from '../api/uploads'
import { tagsApi } from '../api/tags'
import { Card } from '../components/ui/Card'
import { ImagePositioner } from '../components/ImagePositioner'
import type { IncidentCreate, Severity, Status } from '../types'

interface FormData {
  title: string
  description: string
  error_message: string
  stack_trace: string
  root_cause: string
  solution: string
  prevention: string
  severity: Severity
  status: Status
  incident_date: string
  service_id: string
  tag_ids: string[]
  is_pinned: boolean
}

export function IncidentFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!slug

  const { data: incident, isLoading: isLoadingIncident } = useIncident(slug || '')
  const { data: services = [] } = useServicesFlatWithDepth()
  const { data: tags = [] } = useTags()
  const { user, isLoading: isAuthLoading } = useAuthStore()
  const canDeleteTags = user && (user.role === 'admin' || user.role === 'reviewer')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login', { state: { from: window.location.pathname } })
    }
  }, [user, isAuthLoading, navigate])

  // Helper to create indented service name
  const getServiceLabel = (service: typeof services[0]) => {
    const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(service.depth)
    const prefix = service.depth > 0 ? '└─ ' : ''
    return `${indent}${prefix}${service.name}`
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      severity: 'medium',
      status: 'resolved',
      is_pinned: false,
      tag_ids: [],
    },
  })

  const selectedTags = watch('tag_ids') || []

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState('50 50')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const handleImageSelect = async (file: File) => {
    setImageUploading(true)
    setImageError(null)
    try {
      const url = await uploadsApi.uploadImage(file)
      setImageUrl(url)
    } catch (err) {
      console.error('Failed to upload image:', err)
      setImageError('Не удалось загрузить изображение. Попробуйте ещё раз.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleImageRemove = () => {
    setImageUrl(null)
    setImagePosition('50 50')
    setImageError(null)
  }

  // Populate form when editing
  useEffect(() => {
    if (incident && isEditing) {
      reset({
        title: incident.title,
        description: incident.description,
        error_message: incident.error_message || '',
        stack_trace: incident.stack_trace || '',
        root_cause: incident.root_cause || '',
        solution: incident.solution,
        prevention: incident.prevention || '',
        severity: incident.severity,
        status: incident.status,
        incident_date: incident.incident_date?.split('T')[0] || '',
        service_id: String(incident.service_id),
        tag_ids: incident.tags.map((t) => String(t.id)),
        is_pinned: incident.is_pinned,
      })
      setImageUrl(incident.image_url || null)
      setImagePosition(incident.image_position || '50 50')
    }
  }, [incident, isEditing, reset])

  const createMutation = useMutation({
    mutationFn: (data: IncidentCreate) => incidentsApi.create(data),
    onSuccess: (newIncident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      navigate(`/incident/${newIncident.slug}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: IncidentCreate) => incidentsApi.update(incident!.id, data),
    onSuccess: (updatedIncident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      navigate(`/incident/${updatedIncident.slug}`)
    },
  })

  const onSubmit = (data: FormData) => {
    const payload: IncidentCreate = {
      title: data.title,
      description: data.description,
      error_message: data.error_message || undefined,
      stack_trace: data.stack_trace || undefined,
      root_cause: data.root_cause || undefined,
      solution: data.solution,
      prevention: data.prevention || undefined,
      severity: data.severity,
      status: data.status,
      incident_date: data.incident_date || undefined,
      service_id: parseInt(data.service_id, 10),
      tag_ids: data.tag_ids.map((id) => parseInt(id, 10)),
      is_pinned: data.is_pinned,
      image_url: imageUrl || undefined,
      image_position: imagePosition,
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  const tagColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
  ]

  const toggleTag = (tagId: string) => {
    const current = selectedTags
    if (current.includes(tagId)) {
      setValue('tag_ids', current.filter((id) => id !== tagId))
    } else {
      setValue('tag_ids', [...current, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim() || isCreatingTag) return
    setIsCreatingTag(true)
    try {
      const newTag = await tagsApi.create({ name: newTagName.trim(), color: newTagColor })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setValue('tag_ids', [...selectedTags, String(newTag.id)])
      setNewTagName('')
    } catch (err) {
      console.error('Failed to create tag:', err)
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleDeleteTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Удалить этот тег?')) return
    try {
      await tagsApi.delete(tagId)
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setValue('tag_ids', selectedTags.filter((id) => id !== String(tagId)))
    } catch (err) {
      console.error('Failed to delete tag:', err)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  if (isEditing && isLoadingIncident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
        <Link to="/" className="hover:text-text-primary">Главная</Link>
        <span>/</span>
        <span className="text-text-primary">
          {isEditing ? 'Редактирование инцидента' : 'Новый инцидент'}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Редактирование инцидента' : 'Создание инцидента'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {(error as Error).message || 'Произошла ошибка'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Preview image */}
        <div>
          <ImagePositioner
            imageUrl={imageUrl}
            position={imagePosition}
            onPositionChange={setImagePosition}
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
            uploading={imageUploading}
          />
          {imageError && (
            <p className="text-red-500 text-sm mt-2">{imageError}</p>
          )}
        </div>

        {/* Basic info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Основная информация</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Заголовок *</label>
              <input
                {...register('title', { required: 'Обязательное поле' })}
                type="text"
                className="input"
                placeholder="Краткое описание проблемы"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="label">Сервис *</label>
              <select
                {...register('service_id', { required: 'Выберите сервис' })}
                className="input"
              >
                <option value="">Выберите сервис</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getServiceLabel(s)}
                  </option>
                ))}
              </select>
              {errors.service_id && (
                <p className="text-red-500 text-sm mt-1">{errors.service_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Серьёзность</label>
                <select {...register('severity')} className="input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="label">Статус</label>
                <select {...register('status')} className="input">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Дата инцидента</label>
              <input
                {...register('incident_date')}
                type="date"
                className="input"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('is_pinned')}
                type="checkbox"
                id="is_pinned"
                className="w-4 h-4 rounded border-border bg-bg-tertiary"
              />
              <label htmlFor="is_pinned" className="text-sm">
                Закрепить на главной
              </label>
            </div>
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Теги</h2>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <div key={tag.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleTag(String(tag.id))}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedTags.includes(String(tag.id))
                        ? 'text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-border'
                    }`}
                    style={
                      selectedTags.includes(String(tag.id))
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </button>
                  {canDeleteTags && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTag(tag.id, e)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title="Удалить тег"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {tags.length === 0 && (
            <p className="text-text-muted text-sm mb-4">Нет доступных тегов. Создайте первый:</p>
          )}
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {tagColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
              placeholder="Новый тег..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreatingTag}
              className="btn btn-secondary"
              style={{ backgroundColor: newTagColor, color: 'white', borderColor: newTagColor }}
            >
              {isCreatingTag ? '...' : '+ Добавить'}
            </button>
          </div>
        </Card>

        {/* Problem description */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Описание проблемы</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Описание * (Markdown)</label>
              <textarea
                {...register('description', { required: 'Обязательное поле' })}
                className="textarea"
                rows={6}
                placeholder="Подробное описание проблемы..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="label">Сообщение об ошибке</label>
              <textarea
                {...register('error_message')}
                className="textarea font-mono text-sm"
                rows={3}
                placeholder="Error: something went wrong..."
              />
            </div>

            <div>
              <label className="label">Stack trace</label>
              <textarea
                {...register('stack_trace')}
                className="textarea font-mono text-sm"
                rows={6}
                placeholder="Stack trace..."
              />
            </div>
          </div>
        </Card>

        {/* Solution */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Решение</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Причина</label>
              <textarea
                {...register('root_cause')}
                className="textarea"
                rows={3}
                placeholder="Почему возникла проблема..."
              />
            </div>

            <div>
              <label className="label">Решение * (Markdown)</label>
              <textarea
                {...register('solution', { required: 'Обязательное поле' })}
                className="textarea"
                rows={6}
                placeholder="Как была решена проблема..."
              />
              {errors.solution && (
                <p className="text-red-500 text-sm mt-1">{errors.solution.message}</p>
              )}
            </div>

            <div>
              <label className="label">Как предотвратить</label>
              <textarea
                {...register('prevention')}
                className="textarea"
                rows={3}
                placeholder="Рекомендации по предотвращению..."
              />
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
          <Link to={isEditing ? `/incident/${slug}` : '/'} className="btn btn-secondary">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  )
}
