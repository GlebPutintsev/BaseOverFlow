import api from './client'

interface VoteInfo {
  score: number
  user_vote: 'up' | 'down' | null
}

interface VoteRequest {
  vote_type: 'up' | 'down'
}

export const votesApi = {
  getVoteInfo: async (targetType: 'incident' | 'guide', targetId: number): Promise<VoteInfo> => {
    const endpoint = targetType === 'incident' 
      ? `/votes/incidents/${targetId}/votes`
      : `/votes/guides/${targetId}/votes`
    const response = await api.get<VoteInfo>(endpoint)
    return response.data
  },

  vote: async (targetType: 'incident' | 'guide', targetId: number, voteType: 'up' | 'down'): Promise<VoteInfo> => {
    const endpoint = targetType === 'incident'
      ? `/votes/incidents/${targetId}/vote`
      : `/votes/guides/${targetId}/vote`
    const response = await api.post<VoteInfo>(endpoint, { vote_type: voteType } as VoteRequest)
    return response.data
  },
}
