import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { votesApi } from '../../api/votes'
import clsx from 'clsx'

interface VoteButtonsProps {
  targetType: 'incident' | 'guide'
  targetId: number
  initialScore: number
}

export function VoteButtons({
  targetType,
  targetId,
  initialScore,
}: VoteButtonsProps) {
  const { isAuthenticated } = useAuthStore()
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  // Fetch initial vote state
  useEffect(() => {
    if (isAuthenticated) {
      votesApi.getVoteInfo(targetType, targetId)
        .then(info => {
          setScore(info.score)
          setUserVote(info.user_vote)
        })
        .catch(() => {})
    }
  }, [isAuthenticated, targetType, targetId])

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!isAuthenticated || isVoting) return

    setIsVoting(true)
    try {
      const response = await votesApi.vote(targetType, targetId, voteType)
      setScore(response.score)
      setUserVote(response.user_vote)
    } catch (err) {
      console.error('Vote failed:', err)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => handleVote('up')}
        disabled={!isAuthenticated || isVoting}
        className={clsx(
          'p-2 rounded-lg transition-colors',
          userVote === 'up'
            ? 'text-green-500 bg-green-500/20'
            : 'text-text-muted hover:text-green-500 hover:bg-green-500/10',
          (!isAuthenticated || isVoting) && 'opacity-50 cursor-not-allowed'
        )}
        title={isAuthenticated ? 'Полезно' : 'Войдите, чтобы голосовать'}
      >
        ▲
      </button>
      <span
        className={clsx(
          'text-lg font-bold',
          score > 0 && 'text-green-500',
          score < 0 && 'text-red-500',
          score === 0 && 'text-text-muted'
        )}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote('down')}
        disabled={!isAuthenticated || isVoting}
        className={clsx(
          'p-2 rounded-lg transition-colors',
          userVote === 'down'
            ? 'text-red-500 bg-red-500/20'
            : 'text-text-muted hover:text-red-500 hover:bg-red-500/10',
          (!isAuthenticated || isVoting) && 'opacity-50 cursor-not-allowed'
        )}
        title={isAuthenticated ? 'Бесполезно' : 'Войдите, чтобы голосовать'}
      >
        ▼
      </button>
    </div>
  )
}
