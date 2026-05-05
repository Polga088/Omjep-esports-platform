export type CompetitionKind = 'LEAGUE' | 'CUP' | 'CHAMPIONS' | 'UNKNOWN'

export const normalizeCompetitionType = (type: string | undefined | null): CompetitionKind => {
  const u = String(type ?? '')
    .trim()
    .toUpperCase()
  if (u === 'LEAGUE') return 'LEAGUE'
  if (u === 'CUP') return 'CUP'
  if (u === 'CHAMPIONS') return 'CHAMPIONS'
  return 'UNKNOWN'
}

export type CompetitionVisual = {
  kind: CompetitionKind
  label: string
  chipActive: string
  chipIdle: string
  headerGlow: string
  typeBadge: string
  statusBadge: string
  roundHeader: string
  matchCardBorder: string
  matchCardWinner: string
  ptsStatAccent: string
  rankTopTone: string
}

export const getCompetitionVisual = (type: string | undefined | null): CompetitionVisual => {
  const kind = normalizeCompetitionType(type)

  const baseStatus =
    'border-omjep-border/55 bg-omjep-bg-panel-soft/90 text-omjep-text-secondary'

  if (kind === 'LEAGUE') {
    return {
      kind,
      label: 'Ligue',
      chipActive:
        'border-[color-mix(in_srgb,var(--omjep-gold)_52%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_14%,var(--omjep-bg-panel-soft))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_22%,transparent)]',
      chipIdle:
        'border-omjep-border/60 bg-omjep-bg-panel-soft/70 hover:border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))]',
      headerGlow:
        'radial-gradient(ellipse_at_14%_0%,color-mix(in_srgb,var(--omjep-gold)_32%,transparent),transparent_55%),radial-gradient(ellipse_at_88%_110%,color-mix(in_srgb,var(--omjep-mauve)_18%,transparent),transparent_58%)',
      typeBadge:
        'border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-text-primary))]',
      statusBadge: baseStatus,
      roundHeader:
        'border-b border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]',
      matchCardBorder: 'border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))]',
      matchCardWinner:
        'bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
      ptsStatAccent:
        'border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_11%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]',
      rankTopTone:
        'border-[color-mix(in_srgb,var(--omjep-gold)_58%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_18%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_92%,#fff)]',
    }
  }

  if (kind === 'CUP') {
    return {
      kind,
      label: 'Coupe',
      chipActive:
        'border-[color-mix(in_srgb,#c2410c_48%,var(--omjep-border))] bg-[color-mix(in_srgb,#c2410c_14%,var(--omjep-bg-panel-soft))] shadow-[0_0_0_1px_color-mix(in_srgb,#ea580c_24%,transparent)]',
      chipIdle:
        'border-omjep-border/60 bg-omjep-bg-panel-soft/70 hover:border-[color-mix(in_srgb,#c2410c_32%,var(--omjep-border))]',
      headerGlow:
        'radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,#b91c1c_26%,transparent),transparent_56%),radial-gradient(ellipse_at_92%_100%,color-mix(in_srgb,#ea580c_16%,transparent),transparent_58%)',
      typeBadge:
        'border-[color-mix(in_srgb,#b91c1c_45%,var(--omjep-border))] bg-[color-mix(in_srgb,#c2410c_12%,var(--omjep-bg-panel-soft))] text-orange-100',
      statusBadge: baseStatus,
      roundHeader:
        'border-b border-[color-mix(in_srgb,#c2410c_40%,var(--omjep-border))] text-orange-100',
      matchCardBorder: 'border-[color-mix(in_srgb,#c2410c_32%,var(--omjep-border))]',
      matchCardWinner:
        'bg-[color-mix(in_srgb,#c2410c_12%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
      ptsStatAccent:
        'border-[color-mix(in_srgb,#c2410c_36%,var(--omjep-border))] bg-[color-mix(in_srgb,#c2410c_10%,var(--omjep-bg-panel-soft))] text-orange-50',
      rankTopTone:
        'border-[color-mix(in_srgb,#c2410c_50%,var(--omjep-border))] bg-[color-mix(in_srgb,#c2410c_14%,var(--omjep-bg-panel-soft))] text-orange-50',
    }
  }

  if (kind === 'CHAMPIONS') {
    return {
      kind,
      label: 'Ligue des champions',
      chipActive:
        'border-[color-mix(in_srgb,#7c3aed_48%,var(--omjep-border))] bg-[color-mix(in_srgb,#7c3aed_14%,var(--omjep-bg-panel-soft))] shadow-[0_0_0_1px_color-mix(in_srgb,#38bdf8_22%,transparent)]',
      chipIdle:
        'border-omjep-border/60 bg-omjep-bg-panel-soft/70 hover:border-[color-mix(in_srgb,#7c3aed_30%,var(--omjep-border))]',
      headerGlow:
        'radial-gradient(ellipse_at_10%_0%,color-mix(in_srgb,#7c3aed_30%,transparent),transparent_55%),radial-gradient(ellipse_at_95%_100%,color-mix(in_srgb,#38bdf8_18%,transparent),transparent_58%)',
      typeBadge:
        'border-[color-mix(in_srgb,#6366f1_42%,var(--omjep-border))] bg-[color-mix(in_srgb,#7c3aed_12%,var(--omjep-bg-panel-soft))] text-violet-100',
      statusBadge: baseStatus,
      roundHeader:
        'border-b border-[color-mix(in_srgb,#7c3aed_38%,var(--omjep-border))] text-violet-100',
      matchCardBorder: 'border-[color-mix(in_srgb,#6366f1_30%,var(--omjep-border))]',
      matchCardWinner:
        'bg-[color-mix(in_srgb,#7c3aed_12%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
      ptsStatAccent:
        'border-[color-mix(in_srgb,#6366f1_34%,var(--omjep-border))] bg-[color-mix(in_srgb,#7c3aed_10%,var(--omjep-bg-panel-soft))] text-violet-50',
      rankTopTone:
        'border-[color-mix(in_srgb,#7c3aed_48%,var(--omjep-border))] bg-[color-mix(in_srgb,#7c3aed_14%,var(--omjep-bg-panel-soft))] text-violet-50',
    }
  }

  return {
    kind,
    label: 'Compétition',
    chipActive:
      'border-[color-mix(in_srgb,var(--omjep-mauve)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))]',
    chipIdle: 'border-omjep-border/60 bg-omjep-bg-panel-soft/70 hover:border-omjep-border',
    headerGlow:
      'radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,var(--omjep-mauve)_26%,transparent),transparent_58%)',
    typeBadge:
      'border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    statusBadge: baseStatus,
    roundHeader: 'border-b border-omjep-border/70 text-omjep-text-primary',
    matchCardBorder: 'border-omjep-border/65',
    matchCardWinner: 'bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    ptsStatAccent:
      'border-[color-mix(in_srgb,var(--omjep-mauve)_32%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    rankTopTone:
      'border-[color-mix(in_srgb,var(--omjep-mauve)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
  }
}

export const statusLabelFr = (status: string | undefined | null) => {
  const s = String(status ?? '').toUpperCase()
  if (s === 'ONGOING') return 'En cours'
  if (s === 'DRAFT') return 'Brouillon'
  if (s === 'FINISHED') return 'Terminée'
  return status ?? '—'
}
