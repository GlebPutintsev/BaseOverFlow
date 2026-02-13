import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGuide } from '../hooks/useGuides'
import { useServicesFlatWithDepth } from '../hooks/useServices'
import { useTags } from '../hooks/useTags'
import { useAuthStore } from '../store/authStore'
import { guidesApi } from '../api/guides'
import { tagsApi } from '../api/tags'
import { Card } from '../components/ui/Card'
import type { GuideCreate, GuideType } from '../types'

interface FormData {
  title: string
  summary: string
  content: string
  guide_type: GuideType
  service_id: string
  tag_ids: string[]
  is_pinned: boolean
}

export function GuideFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!slug

  const { data: guide, isLoading: isLoadingGuide } = useGuide(slug || '')
  const { data: services = [] } = useServicesFlatWithDepth()
  const { data: tags = [] } = useTags()
  const { user, isLoading: isAuthLoading } = useAuthStore()
  const canDeleteTags = user && (user.role === 'admin' || user.role === 'reviewer')

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login', { state: { from: window.location.pathname } })
    }
  }, [user, isAuthLoading, navigate])

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
      guide_type: 'howto',
      is_pinned: false,
      tag_ids: [],
    },
  })

  const selectedTags = watch('tag_ids') || []

  useEffect(() => {
    if (guide && isEditing) {
      reset({
        title: guide.title,
        summary: guide.summary || '',
        content: guide.content,
        guide_type: guide.guide_type,
        service_id: String(guide.service_id),
        tag_ids: guide.tags.map((t) => String(t.id)),
        is_pinned: guide.is_pinned,
      })
    }
  }, [guide, isEditing, reset])

  const createMutation = useMutation({
    mutationFn: (data: GuideCreate) => guidesApi.create(data),
    onSuccess: (newGuide) => {
      queryClient.invalidateQueries({ queryKey: ['guides'] })
      navigate(`/guide/${newGuide.slug}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: GuideCreate) => guidesApi.update(guide!.id, data),
    onSuccess: (updatedGuide) => {
      queryClient.invalidateQueries({ queryKey: ['guides'] })
      navigate(`/guide/${updatedGuide.slug}`)
    },
  })

  const onSubmit = (data: FormData) => {
    const payload: GuideCreate = {
      title: data.title,
      summary: data.summary || undefined,
      content: data.content,
      guide_type: data.guide_type,
      service_id: parseInt(data.service_id, 10),
      tag_ids: data.tag_ids.map((id) => parseInt(id, 10)),
      is_pinned: data.is_pinned,
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

  if (isEditing && isLoadingGuide) {
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
          {isEditing ? 'Редактирование гайда' : 'Новый гайд'}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Редактирование гайда' : 'Создание гайда'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {(error as Error).message || 'Произошла ошибка'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                placeholder="Название гайда"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="label">Краткое описание</label>
              <input
                {...register('summary')}
                type="text"
                className="input"
                placeholder="О чём этот гайд..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="label">Тип</label>
                <select {...register('guide_type')} className="input">
                  <option value="howto">How-to</option>
                  <option value="runbook">Runbook</option>
                  <option value="reference">Reference</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
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

        {/* Content */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Содержимое</h2>

          <div>
            <label className="label">Контент * (Markdown)</label>
            <textarea
              {...register('content', { required: 'Обязательное поле' })}
              className="textarea font-mono"
              rows={20}
              placeholder="# Заголовок&#10;&#10;Содержимое гайда в формате Markdown..."
            />
            {errors.content && (
              <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
            )}
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
          <Link to={isEditing ? `/guide/${slug}` : '/'} className="btn btn-secondary">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  )
}
