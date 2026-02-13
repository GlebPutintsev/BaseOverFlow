// Enums

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type Status = 'open' | 'in_progress' | 'resolved'

export type PublishStatus = 'draft' | 'pending' | 'published' | 'rejected'

export type GuideType = 'howto' | 'runbook' | 'reference' | 'tutorial' | 'faq'

export type UserRole = 'user' | 'reviewer' | 'admin'

// Tag

export interface Tag {
  id: number
  name: string
  color: string
}

export interface TagCreate {
  name: string
  color?: string
}

// Service

export interface Service {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  parent_id: number | null
  created_at: string
  updated_at: string
}

export interface ServiceWithStats extends Service {
  incidents_count: number
  guides_count: number
}

export interface ServiceWithDepth extends ServiceWithStats {
  depth: number
}

export interface ServiceTree extends ServiceWithStats {
  children: ServiceTree[]
}

export interface ServiceCreate {
  name: string
  description?: string
  icon?: string
  color?: string
  parent_id?: number | null
}

export interface ServiceUpdate {
  name?: string
  description?: string
  icon?: string
  color?: string
  parent_id?: number | null
}

// Incident

export interface Incident {
  id: number
  title: string
  slug: string
  description: string
  error_message: string | null
  stack_trace: string | null
  root_cause: string | null
  solution: string
  prevention: string | null
  severity: Severity
  status: Status
  author: string | null
  author_id: number | null
  author_username: string | null
  views: number
  score: number
  publish_status: PublishStatus
  is_pinned: boolean
  service_id: number
  created_at: string
  updated_at: string
  incident_date: string | null
  tags: Tag[]
  service: Service | null
}

export interface IncidentList {
  id: number
  title: string
  slug: string
  severity: Severity
  status: Status
  author: string | null
  author_id: number | null
  author_username: string | null
  views: number
  score: number
  publish_status: PublishStatus
  is_pinned: boolean
  service_id: number
  created_at: string
  tags: Tag[]
  service: Service | null
}

export interface IncidentCreate {
  title: string
  description: string
  error_message?: string
  stack_trace?: string
  root_cause?: string
  solution: string
  prevention?: string
  severity?: Severity
  status?: Status
  author?: string
  incident_date?: string
  is_pinned?: boolean
  service_id: number
  tag_ids?: number[]
}

export interface IncidentUpdate {
  title?: string
  description?: string
  error_message?: string
  stack_trace?: string
  root_cause?: string
  solution?: string
  prevention?: string
  severity?: Severity
  status?: Status
  author?: string
  incident_date?: string
  service_id?: number
  tag_ids?: number[]
  is_pinned?: boolean
}

// Guide

export interface Guide {
  id: number
  title: string
  slug: string
  summary: string | null
  content: string
  guide_type: GuideType
  author: string | null
  author_id: number | null
  author_username: string | null
  views: number
  score: number
  publish_status: PublishStatus
  is_pinned: boolean
  service_id: number
  created_at: string
  updated_at: string
  tags: Tag[]
  service: Service | null
}

export interface GuideList {
  id: number
  title: string
  slug: string
  summary: string | null
  guide_type: GuideType
  author: string | null
  author_id: number | null
  author_username: string | null
  views: number
  score: number
  publish_status: PublishStatus
  is_pinned: boolean
  service_id: number
  created_at: string
  tags: Tag[]
  service: Service | null
}

export interface GuideCreate {
  title: string
  summary?: string
  content: string
  guide_type?: GuideType
  author?: string
  is_pinned?: boolean
  service_id: number
  tag_ids?: number[]
}

export interface GuideUpdate {
  title?: string
  summary?: string
  content?: string
  guide_type?: GuideType
  author?: string
  is_pinned?: boolean
  service_id?: number
  tag_ids?: number[]
}

// User & Auth

export interface User {
  id: number
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  position: string | null
  skills: string | null
  role: UserRole
  reputation: number
  is_active: boolean
  created_at: string
}

export interface UserPublicProfile {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  position: string | null
  skills: string | null
  role: UserRole
  created_at: string
}

export interface UserRegister {
  email: string
  username: string
  password: string
  display_name?: string
}

export interface UserLogin {
  email_or_username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface UserUpdate {
  display_name?: string
  avatar_url?: string
  bio?: string
  position?: string
  skills?: string
}

// Search

export interface SearchResult {
  id: number
  type: 'incident' | 'guide'
  title: string
  slug: string
  excerpt: string
  service_id: number
  service_name: string
  service_slug: string
  tags: Tag[]
  created_at: string
  score: number
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
  took_ms: number
}

export interface Suggestion {
  id: number
  type: 'incident' | 'guide'
  title: string
  slug: string
  service_name: string
  score: number
}

export interface SuggestionsResponse {
  query: string
  suggestions: Suggestion[]
  corrected_query: string | null
  took_ms: number
}

// Comments

export interface Comment {
  id: number
  content: string
  author_id: number | null
  author_name: string | null
  author_username: string | null
  author_display_name: string | null
  incident_id: number | null
  guide_id: number | null
  parent_id: number | null
  score: number
  created_at: string
  updated_at: string | null
  is_top_answer: boolean
  replies: Comment[]
  user_vote: 'upvote' | 'downvote' | null
}

export interface CommentCreate {
  content: string
  incident_id?: number
  guide_id?: number
  parent_id?: number
}

export interface CommentUpdate {
  content: string
}

export interface CommentsListResponse {
  comments: Comment[]
  total: number
}

export interface CommentVoteResponse {
  action: 'added' | 'removed' | 'changed' | 'error'
  new_score: number
  user_vote: 'upvote' | 'downvote' | null
}

// Notifications

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// Moderation

export interface ModerationItem {
  id: number
  type: 'incident' | 'guide'
  title: string
  slug: string
  author: string | null
  service_name: string
  created_at: string
  publish_status: PublishStatus
}

// API Response Types

export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

// Home Page Stats

export interface HomeStats {
  total_incidents: number
  total_guides: number
  services_count: number
}

export interface RecentItem {
  type: 'incident' | 'guide'
  item: Incident | Guide
  date: string
}

export interface TopRatedItem {
  type: 'incident' | 'guide'
  item: Incident | Guide
  score: number
}
