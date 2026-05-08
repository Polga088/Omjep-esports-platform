import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Mail, Save, SendHorizonal } from 'lucide-react'
import api from '@/lib/api'

type EmailTemplate = {
  id: string
  key: string
  name: string
  subject: string
  preheader: string | null
  htmlContent: string
  textContent: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const getByPath = (obj: Record<string, unknown>, path: string) => {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = obj
  for (const p of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[p]
  }
  return current
}

const renderPlaceholders = (template: string, variables: Record<string, unknown>) => {
  const re = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g
  return template.replace(re, (_m, rawKey) => {
    const key = String(rawKey ?? '').trim()
    const val = getByPath(variables, key)
    if (val == null) return ''
    const str = typeof val === 'string' ? val : JSON.stringify(val)
    return escapeHtml(str)
  })
}

const templateVarsHelper: Record<string, string[]> = {
  club_invitation: ['clubName', 'inviterName', 'actionUrl'],
  support_ticket_created: ['ticketId', 'displayName', 'subject'],
  support_ticket_reply: ['ticketId', 'message'],
  match_scheduled: ['homeTeam', 'awayTeam', 'scheduledAt', 'competitionName'],
  match_result_validated: ['homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'competitionName'],
}

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [draft, setDraft] = useState<EmailTemplate | null>(null)
  const [testTo, setTestTo] = useState('')
  const [variablesJson, setVariablesJson] = useState('{\n  \n}')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingList(true)
      setError(null)
      try {
        const res = await api.get<EmailTemplate[]>('/admin/email-templates')
        if (cancelled) return
        const list = res.data ?? []
        setTemplates(list)
        setSelectedKey((prev) => prev ?? list[0]?.key ?? null)
      } catch {
        if (!cancelled) setError('Impossible de charger les templates emails.')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedKey) {
      setDraft(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoadingDetail(true)
      setError(null)
      setSuccess(null)
      try {
        const res = await api.get<EmailTemplate>(`/admin/email-templates/${selectedKey}`)
        if (cancelled) return
        setDraft(res.data)
        const helper = templateVarsHelper[selectedKey] ?? []
        const initialVars = helper.reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = ''
          return acc
        }, {})
        setVariablesJson(JSON.stringify(initialVars, null, 2))
      } catch {
        if (!cancelled) setError('Impossible de charger ce template.')
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selectedKey])

  const parsedVariables = useMemo(() => {
    try {
      const v = JSON.parse(variablesJson)
      if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
      return v as Record<string, unknown>
    } catch {
      return {}
    }
  }, [variablesJson])

  const previewHtml = useMemo(() => {
    if (!draft) return ''
    return renderPlaceholders(draft.htmlContent ?? '', parsedVariables)
  }, [draft, parsedVariables])

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.patch<EmailTemplate>(`/admin/email-templates/${draft.key}`, {
        name: draft.name,
        subject: draft.subject,
        preheader: draft.preheader,
        htmlContent: draft.htmlContent,
        textContent: draft.textContent,
        enabled: draft.enabled,
      })
      setDraft(res.data)
      setSuccess('Template sauvegardé.')
      const listRes = await api.get<EmailTemplate[]>('/admin/email-templates')
      setTemplates(listRes.data ?? [])
    } catch {
      setError('Impossible de sauvegarder ce template.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!draft) return
    const to = testTo.trim()
    if (!to) {
      setError('Adresse email de test requise.')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      await api.post(`/admin/email-templates/${draft.key}/test`, {
        to,
        variables: parsedVariables,
        subjectPrefix: '[TEST]',
      })
      setSuccess('Email de test envoyé.')
    } catch {
      setError('Échec envoi email de test.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-omjep-text-muted">Admin</p>
          <h1 className="mt-1 font-heading text-2xl font-black text-omjep-text-primary">Templates emails</h1>
          <p className="mt-2 text-sm text-omjep-text-secondary">
            Éditez les templates OMJEP et envoyez un email de test via le SMTP local (Postfix).
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/70 px-4 py-3 text-sm text-omjep-text-secondary">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-omjep-text-muted" aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/70 px-4 py-3 text-sm text-omjep-text-secondary">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color-mix(in_srgb,var(--omjep-gold)_70%,#fff)]" aria-hidden />
            <span>{success}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
          <div className="border-b border-omjep-border/70 bg-omjep-bg-panel-soft/70 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-omjep-text-muted">Templates</p>
          </div>
          <div className="p-3">
            {loadingList ? (
              <div className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/70 px-4 py-8 text-sm text-omjep-text-secondary">
                Chargement…
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/70 px-4 py-8 text-sm text-omjep-text-secondary">
                Aucun template.
              </div>
            ) : (
              <ul className="space-y-2">
                {templates.map((t) => {
                  const active = t.key === selectedKey
                  return (
                    <li key={t.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(t.key)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))]'
                            : 'border-omjep-border/60 bg-omjep-bg-panel-soft/70 hover:border-omjep-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-omjep-text-primary">{t.name}</p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              t.enabled
                                ? 'border-omjep-border/60 bg-omjep-bg-panel text-omjep-text-secondary'
                                : 'border-omjep-border/60 bg-omjep-bg-panel text-omjep-text-muted'
                            }`}
                          >
                            {t.enabled ? 'Actif' : 'Désactivé'}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
                          {t.key}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
          <div className="border-b border-omjep-border/70 bg-omjep-bg-panel-soft/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-omjep-text-muted">Éditeur</p>
                <p className="mt-1 text-sm font-bold text-omjep-text-primary">{draft?.key ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !draft}
                  className="inline-flex items-center gap-2 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-omjep-text-secondary hover:border-omjep-border disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>

          {loadingDetail ? (
            <div className="p-4 text-sm text-omjep-text-secondary">Chargement…</div>
          ) : !draft ? (
            <div className="p-4 text-sm text-omjep-text-secondary">Sélectionnez un template.</div>
          ) : (
            <div className="grid gap-6 p-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Nom</span>
                    <input
                      value={draft.name ?? ''}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Actif</span>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-bold ${
                        draft.enabled
                          ? 'border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-primary'
                          : 'border-omjep-border/70 bg-omjep-bg-panel-soft text-omjep-text-secondary'
                      }`}
                    >
                      <span>{draft.enabled ? 'Activé' : 'Désactivé'}</span>
                      <Mail className="h-4 w-4 text-omjep-text-muted" aria-hidden />
                    </button>
                  </label>
                </div>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Sujet</span>
                  <input
                    value={draft.subject ?? ''}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Preheader</span>
                  <input
                    value={draft.preheader ?? ''}
                    onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
                    className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary focus:outline-none"
                  />
                </label>

                <div className="grid gap-4">
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">HTML</span>
                    <textarea
                      value={draft.htmlContent ?? ''}
                      onChange={(e) => setDraft({ ...draft, htmlContent: e.target.value })}
                      rows={12}
                      className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-xs text-omjep-text-primary focus:outline-none font-mono"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">
                      Texte (fallback)
                    </span>
                    <textarea
                      value={draft.textContent ?? ''}
                      onChange={(e) => setDraft({ ...draft, textContent: e.target.value })}
                      rows={6}
                      className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-xs text-omjep-text-primary focus:outline-none font-mono"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/60 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Variables</p>
                  <p className="mt-2 text-xs text-omjep-text-secondary">
                    Placeholders au format <span className="font-mono text-omjep-text-primary">{'{{variable}}'}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(templateVarsHelper[draft.key] ?? []).map((v) => (
                      <span
                        key={v}
                        className="rounded-full border border-omjep-border/60 bg-omjep-bg-panel px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-omjep-text-secondary"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  <textarea
                    value={variablesJson}
                    onChange={(e) => setVariablesJson(e.target.value)}
                    rows={8}
                    className="mt-3 w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel px-3 py-2.5 text-xs text-omjep-text-primary focus:outline-none font-mono"
                  />
                </div>

                <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)] overflow-hidden">
                  <div className="border-b border-omjep-border/70 bg-omjep-bg-panel-soft/70 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Preview</p>
                    <p className="mt-1 text-xs text-omjep-text-secondary">
                      Rendu sécurisé (variables échappées) dans un iframe.
                    </p>
                  </div>
                  <div className="bg-[#050912] p-3">
                    <div className="mx-auto max-w-[680px] rounded-xl border border-white/10 bg-black/20">
                      <iframe
                        title="Email preview"
                        sandbox="allow-same-origin"
                        className="h-[520px] w-full rounded-xl bg-[#050912]"
                        srcDoc={previewHtml}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/60 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">Test email</p>
                  <label className="mt-3 block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-omjep-text-muted">
                      Destinataire
                    </span>
                    <input
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder="email@exemple.com"
                      className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel px-3 py-2.5 text-sm text-omjep-text-primary focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={sending || !draft}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel px-3 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-omjep-text-secondary hover:border-omjep-border disabled:opacity-60"
                  >
                    <SendHorizonal className="h-4 w-4" aria-hidden />
                    {sending ? 'Envoi…' : 'Envoyer un test'}
                  </button>
                  <p className="mt-2 text-xs text-omjep-text-muted">
                    L’API envoie via SMTP local. Aucun envoi automatique n’est câblé aux workflows existants.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

