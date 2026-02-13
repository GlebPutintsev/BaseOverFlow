import clsx from 'clsx'
import type { Severity, GuideType, PublishStatus } from '../../types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'outline'
  color?: string
  className?: string
}

export function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'outline' && 'border',
        className
      )}
      style={
        color
          ? {
              backgroundColor: variant === 'default' ? `${color}20` : 'transparent',
              color: color,
              borderColor: variant === 'outline' ? color : undefined,
            }
          : undefined
      }
    >
      {children}
    </span>
  )
}

const severityColors: Record<Severity, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

const severityLabels: Record<Severity, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge color={severityColors[severity]}>
      {severityLabels[severity]}
    </Badge>
  )
}

const guideTypeColors: Record<GuideType, string> = {
  howto: '#3b82f6',
  runbook: '#8b5cf6',
  reference: '#06b6d4',
  tutorial: '#10b981',
  faq: '#f59e0b',
}

const guideTypeLabels: Record<GuideType, string> = {
  howto: 'how-to',
  runbook: 'runbook',
  reference: 'reference',
  tutorial: 'tutorial',
  faq: 'FAQ',
}

export function GuideTypeBadge({ type }: { type: GuideType }) {
  return (
    <Badge color={guideTypeColors[type]}>
      {guideTypeLabels[type]}
    </Badge>
  )
}

const publishStatusColors: Record<PublishStatus, string> = {
  draft: '#6b7280',
  pending: '#f59e0b',
  published: '#22c55e',
  rejected: '#ef4444',
}

const publishStatusLabels: Record<PublishStatus, string> = {
  draft: 'Черновик',
  pending: 'На модерации',
  published: 'Опубликовано',
  rejected: 'Отклонено',
}

export function PublishStatusBadge({ status }: { status: PublishStatus }) {
  return (
    <Badge color={publishStatusColors[status]}>
      {publishStatusLabels[status]}
    </Badge>
  )
}
