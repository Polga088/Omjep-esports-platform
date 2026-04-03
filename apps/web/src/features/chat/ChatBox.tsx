import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAT_MESSAGES_PAGE_SIZE,
  type ChatMessagePayload,
} from '@omjep/shared';
import api from '@/lib/api';
import { Loader2, MessageCircle, Radio, Send, Users, ChevronUp } from 'lucide-react';
import { useChatSocket } from './useChatSocket';
import { ChatContactAvatar, type ChatContactRow } from './ChatContactAvatar';
import RankBadge from '@/components/RankBadge';
import { ChatTacticalIncomingBody } from './ChatTacticalIncomingBody';

type Me = { id: string; email: string; role?: string; level?: number };
type Contact = ChatContactRow;
type MyTeamRes = { id: string; name: string } | null;

export default function ChatBox({ me }: { me: Me }) {
  const [team, setTeam] = useState<MyTeamRes>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineManagers, setOnlineManagers] = useState<string[]>([]);
  const [mode, setMode] = useState<'team' | 'dm'>('dm');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingPeer, setTypingPeer] = useState(false);
  /** Messages entrants temps réel : effet decrypt + typewriter */
  const [tacticalIncomingIds, setTacticalIncomingIds] = useState<Set<string>>(() => new Set());
  const { socket, isConnected } = useChatSocket(me.id);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const loadTeamMessages = useCallback(
    async (cursor?: string) => {
      if (!team?.id) return;
      const params = new URLSearchParams({ teamId: team.id });
      if (cursor) params.set('cursor', cursor);
      const { data } = await api.get<{
        messages: ChatMessagePayload[];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/chat/messages/team?${params}`);
      return data;
    },
    [team?.id],
  );

  const loadDmMessages = useCallback(
    async (otherId: string, cursor?: string) => {
      const params = new URLSearchParams({ peerId: otherId });
      if (cursor) params.set('cursor', cursor);
      const { data } = await api.get<{
        messages: ChatMessagePayload[];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/chat/messages/dm?${params}`);
      return data;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamRes, contactsRes] = await Promise.all([
          api.get<MyTeamRes>('/teams/my-team').catch(() => ({ data: null as MyTeamRes })),
          api.get<Contact[]>('/chat/contacts/managers'),
        ]);
        if (cancelled) return;
        setTeam(teamRes.data);
        setContacts(contactsRes.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onPresence = (p: { onlineIds: string[] }) => {
      setOnlineManagers(p.onlineIds ?? []);
    };
    const onMessage = (msg: ChatMessagePayload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender_id !== me.id) {
        setTacticalIncomingIds((prev) => {
          const next = new Set(prev);
          next.add(msg.id);
          return next;
        });
      }
      scrollBottom();
    };
    const onTyping = (t: { userId: string; isTyping: boolean }) => {
      if (t.userId !== me.id) setTypingPeer(!!t.isTyping);
    };
    socket.on('presence:managers', onPresence);
    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    return () => {
      socket.off('presence:managers', onPresence);
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
    };
  }, [socket, me.id]);

  useEffect(() => {
    const s = socket;
    if (!s || !isConnected) return;
    if (mode === 'team' && team?.id) {
      s.emit('join_team', { teamId: team.id });
      setMessages([]);
      setNextCursor(null);
      loadTeamMessages().then((d) => {
        if (!d) return;
        setMessages(d.messages);
        setNextCursor(d.nextCursor);
        scrollBottom();
      });
    }
  }, [mode, team?.id, isConnected, loadTeamMessages, socket]);

  useEffect(() => {
    const s = socket;
    if (!s || !isConnected || mode !== 'dm' || !peerId) return;
    s.emit('join_dm', { peerId });
    setMessages([]);
    setNextCursor(null);
    loadDmMessages(peerId).then((d) => {
      setMessages(d.messages);
      setNextCursor(d.nextCursor);
      scrollBottom();
      const unread = d.messages.filter((m) => m.receiver_id === me.id && !m.is_read).map((m) => m.id);
      if (unread.length) void api.post('/chat/messages/read', { messageIds: unread });
    });
  }, [mode, peerId, isConnected, loadDmMessages, me.id, socket]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !socket) return;
    setSending(true);
    try {
      if (mode === 'team' && team?.id) {
        socket.emit('send_message', { teamId: team.id, content: text });
      } else if (mode === 'dm' && peerId) {
        socket.emit('send_message', { receiverId: peerId, content: text });
      }
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const emitTyping = (isTyping: boolean) => {
    const s = socket;
    if (!s) return;
    if (mode === 'team' && team?.id) {
      s.emit('typing', { teamId: team.id, isTyping });
    } else if (mode === 'dm' && peerId) {
      s.emit('typing', { peerId, isTyping });
    }
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data =
        mode === 'team' && team?.id
          ? await loadTeamMessages(nextCursor)
          : peerId
            ? await loadDmMessages(peerId, nextCursor)
            : null;
      if (!data) return;
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const peerLabel = useMemo(() => {
    if (!peerId) return '';
    return contacts.find((c) => c.id === peerId)?.ea_persona_name ?? contacts.find((c) => c.id === peerId)?.email ?? peerId;
  }, [contacts, peerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  const clearTactical = useCallback((messageId: string) => {
    setTacticalIncomingIds((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

  const glassShell =
    'relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050910]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl';

  return (
    <div className="grid min-h-[70vh] gap-6 lg:grid-cols-[300px_1fr]">
      <aside className={`${glassShell} p-4`}>
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.09] dashboard-hero-tech-grid" aria-hidden />
        <div className="relative z-[1] space-y-4">
        <div className="flex items-center gap-2 text-cyan-300/90">
          <Radio className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Tactical Link</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400/80">
          <Users className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contacts</span>
        </div>
        {team && (
          <button
            type="button"
            onClick={() => {
              setMode('team');
              setPeerId(null);
            }}
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
              mode === 'team'
                ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-50'
                : 'border-white/[0.08] text-slate-400 hover:border-cyan-500/25'
            }`}
          >
            Salon · {team.name}
          </button>
        )}
        <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
          {contacts.map((c) => {
            const online = onlineManagers.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setMode('dm');
                  setPeerId(c.id);
                }}
                className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left text-sm transition-colors ${
                  mode === 'dm' && peerId === c.id
                    ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-50'
                    : 'border-white/[0.06] text-slate-400 hover:border-cyan-500/20'
                }`}
              >
                <ChatContactAvatar contact={c} />
                <RankBadge level={c.level ?? 1} size="sm" showLabel={false} className="shrink-0" />
                <span
                  className={`mt-[2px] h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{c.ea_persona_name ?? c.email}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-600">
          {CHAT_MESSAGES_PAGE_SIZE} derniers messages par chargement — bouton « Charger plus » pour l’historique.
        </p>
        </div>
      </aside>

      <section className={`${glassShell} flex min-h-[420px] flex-col`}>
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.07] dashboard-hero-tech-grid" aria-hidden />
        <header className="relative z-[1] flex min-w-0 items-center gap-2 border-b border-cyan-500/15 px-4 py-3">
          <MessageCircle className="h-5 w-5 shrink-0 text-cyan-400" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="min-w-0 truncate text-sm font-bold text-white">
              {mode === 'team' && team ? `Salon ${team.name}` : mode === 'dm' && peerId ? `MP · ${peerLabel}` : 'Conversation'}
            </h2>
            {mode === 'team' && typeof me.level === 'number' && (
              <RankBadge level={me.level} size="sm" showLabel={false} className="shrink-0" />
            )}
            {mode === 'dm' && peerId ? (
              <RankBadge
                level={contacts.find((x) => x.id === peerId)?.level ?? 1}
                size="sm"
                showLabel={false}
                className="shrink-0"
              />
            ) : null}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold ${
              isConnected ? 'text-emerald-400' : 'text-orange-400'
            }`}
            title={isConnected ? 'Socket temps réel actif' : 'Reconnexion au serveur…'}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]'
                  : 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.55)] animate-pulse'
              }`}
              aria-hidden
            />
            {isConnected ? 'En ligne' : 'Connexion…'}
          </span>
        </header>

        <div
          ref={listRef}
          className="relative z-[1] max-h-[50vh] min-h-[280px] flex-1 space-y-3 overflow-y-auto px-4 py-3"
        >
          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400/80 hover:text-amber-300 disabled:opacity-40"
              >
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5" />}
                Charger plus
              </button>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me.id;
            const tactical = !mine && tacticalIncomingIds.has(m.id);
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm ${
                    mine
                      ? 'border-amber-500/25 bg-amber-500/15 text-amber-50'
                      : tactical
                        ? 'border-cyan-500/30 bg-cyan-950/25 text-slate-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                        : 'border-white/10 bg-white/[0.05] text-slate-200'
                  }`}
                >
                  {!mine && (
                    <p className="mb-1 text-[10px] font-semibold text-cyan-400/85">
                      {m.sender?.ea_persona_name ?? m.sender?.email ?? '…'}
                    </p>
                  )}
                  {tactical ? (
                    <ChatTacticalIncomingBody
                      content={m.content}
                      onAnimationEnd={() => clearTactical(m.id)}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[9px] text-slate-500">
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {mine && mode === 'dm' && (
                      <span className={m.is_read ? 'text-emerald-400/80' : ''}>{m.is_read ? 'Lu' : '…'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {typingPeer && (
            <p className="pl-1 text-[11px] italic text-cyan-500/70">En train d’écrire…</p>
          )}
        </div>

        <footer className="relative z-[1] flex gap-2 border-t border-cyan-500/15 p-3">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              mode === 'team' && !team
                ? 'Aucun club — rejoignez une équipe pour le salon'
                : mode === 'dm' && !peerId
                  ? 'Choisissez un contact'
                  : 'Votre message…'
            }
            disabled={(mode === 'team' && !team) || (mode === 'dm' && !peerId)}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/35"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || (mode === 'team' && !team) || (mode === 'dm' && !peerId)}
            className="inline-flex items-center gap-2 self-end rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-[#041016] hover:bg-cyan-400 disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </footer>
      </section>
    </div>
  );
}
