import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { commentsApi } from '../api/comments'
import { Card } from './ui/Card'
import type { Comment, CommentCreate } from '../types'

interface CommentsProps {
  incidentId?: number
  guideId?: number
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CommentVoteButtons({
  comment,
  onVote,
  isVoting,
}: {
  comment: Comment
  onVote: (type: 'upvote' | 'downvote') => void
  isVoting: boolean
}) {
  const { user } = useAuthStore()
  const isOwnComment = user?.id === comment.author_id

  return (
    <div className="flex flex-col items-center gap-1 mr-3">
      <button
        onClick={() => onVote('upvote')}
        disabled={isVoting || !user || isOwnComment}
        className={`p-1 rounded transition-colors ${
          comment.user_vote === 'upvote'
            ? 'text-green-500'
            : 'text-text-muted hover:text-green-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isOwnComment ? 'Нельзя голосовать за свой комментарий' : 'Полезный комментарий'}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <span className={`text-sm font-medium ${
        comment.score > 0 ? 'text-green-500' : comment.score < 0 ? 'text-red-500' : 'text-text-muted'
      }`}>
        {comment.score}
      </span>
      <button
        onClick={() => onVote('downvote')}
        disabled={isVoting || !user || isOwnComment}
        className={`p-1 rounded transition-colors ${
          comment.user_vote === 'downvote'
            ? 'text-red-500'
            : 'text-text-muted hover:text-red-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isOwnComment ? 'Нельзя голосовать за свой комментарий' : 'Бесполезный комментарий'}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  onVote,
  isVoting,
  isNested = false,
}: {
  comment: Comment
  onReply: (parentId: number) => void
  onDelete: (commentId: number) => void
  onVote: (commentId: number, type: 'upvote' | 'downvote') => void
  isVoting: boolean
  isNested?: boolean
}) {
  const { user } = useAuthStore()
  const isAuthor = user?.id === comment.author_id
  const isModerator = user?.role === 'admin' || user?.role === 'reviewer'
  const canDelete = isAuthor || isModerator

  return (
    <div
      className={`flex ${isNested ? 'ml-8 mt-3' : ''} ${
        comment.is_top_answer ? 'bg-green-500/10 border border-green-500/30 rounded-lg p-3 -m-3' : ''
      }`}
    >
      <CommentVoteButtons
        comment={comment}
        onVote={(type) => onVote(comment.id, type)}
        isVoting={isVoting}
      />
      <div className="flex-1">
        {comment.is_top_answer && (
          <div className="flex items-center gap-2 mb-2 text-green-500 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Лучший ответ
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span>
            {comment.author_username ? (
              <Link
                to={`/user/${comment.author_username}`}
                className="text-accent-primary hover:underline"
              >
                {comment.author_display_name || comment.author_name || 'Аноним'}
              </Link>
            ) : (
              comment.author_display_name || comment.author_name || 'Аноним'
            )}
          </span>
          <span>{formatDate(comment.created_at)}</span>
          {comment.updated_at && <span>(изменён)</span>}
          {user && !isNested && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-accent-primary hover:underline"
            >
              Ответить
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-red-500 hover:underline"
            >
              Удалить
            </button>
          )}
        </div>
        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 border-l-2 border-border-subtle pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                onVote={onVote}
                isVoting={isVoting}
                isNested
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentForm({
  incidentId,
  guideId,
  parentId,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  incidentId?: number
  guideId?: number
  parentId?: number
  onSubmit: (data: CommentCreate) => void
  onCancel?: () => void
  isSubmitting: boolean
}) {
  const [content, setContent] = useState('')
  const { user } = useAuthStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      incident_id: incidentId,
      guide_id: guideId,
      parent_id: parentId,
    })
    setContent('')
  }

  if (!user) {
    return (
      <div className="text-center py-4 text-text-muted">
        <Link to="/login" className="text-accent-primary hover:underline">
          Войдите
        </Link>
        , чтобы оставить комментарий
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Ваш ответ...' : 'Добавьте комментарий, решение или уточнение...'}
        className="textarea w-full"
        rows={parentId ? 2 : 4}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="btn btn-primary btn-sm"
        >
          {isSubmitting ? 'Отправка...' : parentId ? 'Ответить' : 'Отправить'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}

export function Comments({ incidentId, guideId }: CommentsProps) {
  const queryClient = useQueryClient()
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  const queryKey = incidentId
    ? ['comments', 'incident', incidentId]
    : ['comments', 'guide', guideId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      incidentId
        ? commentsApi.getForIncident(incidentId)
        : commentsApi.getForGuide(guideId!),
    enabled: !!incidentId || !!guideId,
  })

  const createMutation = useMutation({
    mutationFn: commentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setReplyingTo(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: commentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ commentId, voteType }: { commentId: number; voteType: 'upvote' | 'downvote' }) =>
      commentsApi.vote(commentId, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleDelete = (commentId: number) => {
    if (confirm('Удалить комментарий?')) {
      deleteMutation.mutate(commentId)
    }
  }

  const handleVote = (commentId: number, voteType: 'upvote' | 'downvote') => {
    voteMutation.mutate({ commentId, voteType })
  }

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">Загрузка комментариев...</div>
      </Card>
    )
  }

  const comments = data?.comments || []

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">
        Комментарии и решения ({data?.total || 0})
      </h3>

      {/* Comment form */}
      <div className="mb-6">
        <CommentForm
          incidentId={incidentId}
          guideId={guideId}
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
        />
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          Пока нет комментариев. Будьте первым!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={setReplyingTo}
                onDelete={handleDelete}
                onVote={handleVote}
                isVoting={voteMutation.isPending}
              />
              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-8 mt-3">
                  <CommentForm
                    incidentId={incidentId}
                    guideId={guideId}
                    parentId={comment.id}
                    onSubmit={(data) => createMutation.mutate(data)}
                    onCancel={() => setReplyingTo(null)}
                    isSubmitting={createMutation.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
