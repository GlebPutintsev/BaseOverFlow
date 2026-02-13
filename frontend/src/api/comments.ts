import api from './client'
import type {
  Comment,
  CommentCreate,
  CommentUpdate,
  CommentsListResponse,
  CommentVoteResponse,
} from '../types'

export const commentsApi = {
  getForIncident: async (incidentId: number): Promise<CommentsListResponse> => {
    const response = await api.get<CommentsListResponse>(`/comments/incident/${incidentId}`)
    return response.data
  },

  getForGuide: async (guideId: number): Promise<CommentsListResponse> => {
    const response = await api.get<CommentsListResponse>(`/comments/guide/${guideId}`)
    return response.data
  },

  create: async (data: CommentCreate): Promise<Comment> => {
    const response = await api.post<Comment>('/comments/', data)
    return response.data
  },

  update: async (commentId: number, data: CommentUpdate): Promise<Comment> => {
    const response = await api.put<Comment>(`/comments/${commentId}`, data)
    return response.data
  },

  delete: async (commentId: number): Promise<void> => {
    await api.delete(`/comments/${commentId}`)
  },

  vote: async (commentId: number, voteType: 'upvote' | 'downvote'): Promise<CommentVoteResponse> => {
    const response = await api.post<CommentVoteResponse>(`/comments/${commentId}/vote`, {
      vote_type: voteType,
    })
    return response.data
  },
}
