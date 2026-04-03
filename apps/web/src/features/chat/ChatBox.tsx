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
  const { socket, isConnected } = useChatSocket(me.id);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const peerLabel = useMemo(() => {
    if (!peerId) return '';
    return contacts.find((c) => c.id === peerId)?.ea_persona_name ?? contacts.find((c) => c.id === peerId)?.email ?? peerId;
  }, [contacts, peerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamRes, contactsRes] = await Promise.all([
          api.get<MyTeamRes>('/teams/my-team').catch(() => ({ data: null as MyTeamRes })),
          api.get<Contact[]>('/chat/contacts/managers').catch(() => ({ data: [] as Contact[] })),
        ]);
        if (cancelled) return;
        setTeam(teamRes.data);
        setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
      } catch {
        if (!cancelled) {
          setTeam(null);
          setContacts([]);
        }
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

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

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

  if (loading) {
    return (
      <div className="relative z-0 flex min-h-[50vh] items-center justify-center rounded-2xl border border-white/10 bg-[#08090c] py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-[#08090c] lg:grid-cols-[300px_1fr]">
      <aside className="relative border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="pointer-events-none absolute inset-0 z-0 chat-terminal-grid" aria-hidden />
        <div className="relative z-[1] space-y-4">
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <Radio className="h-4 w-4 shrink-0" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Messagerie</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Users className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Contacts</span>
        </div>
        {team && (
          <button
            type="button"
            onClick={() => {
              setMode('team');
              setPeerId(null);
            }}
            className={`w-full rounded-lg border border-white/10 px-3 py-2.5 text-left text-sm transition-colors ${
              mode === 'team'
                ? 'bg-white/[0.05] text-slate-200'
                : 'bg-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'
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
                className={`flex w-full items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-left text-sm transition-colors ${
                  mode === 'dm' && peerId === c.id
                    ? 'bg-white/[0.05] text-slate-200'
                    : 'bg-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'
                }`}
              >
                <ChatContactAvatar contact={c} terminal />
                <span
                  className={`mt-[2px] h-2 w-2 shrink-0 rounded-full ${online ? 'bg-slate-400' : 'bg-slate-700'}`}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{c.ea_persona_name ?? c.email}</span>
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-slate-600">
          {CHAT_MESSAGES_PAGE_SIZE} derniers messages / chargement — historique via « Charger plus ».
        </p>
        </div>
      </aside>

      <section className="relative flex min-h-[420px] flex-col">
        <div className="pointer-events-none absolute inset-0 z-0 chat-terminal-grid" aria-hidden />
        <header className="relative z-[1] flex min-w-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          <MessageCircle className="h-5 w-5 shrink-0 text-slate-500" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="min-w-0 truncate font-mono text-sm font-medium text-slate-200">
              {mode === 'team' && team ? `Salon ${team.name}` : mode === 'dm' && peerId ? `MP · ${peerLabel}` : 'Conversation'}
            </h2>
            {mode === 'team' ? (
              <RankBadge level={me.level ?? 1} size="sm" showLabel={false} className="shrink-0" />
            ) : null}
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
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium text-slate-500"
            title={isConnected ? 'Canal actif' : 'Reconnexion…'}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-sm border border-white/20 ${
                isConnected ? 'bg-slate-500' : 'animate-pulse bg-slate-700'
              }`}
              aria-hidden
            />
            {isConnected ? 'OK' : '…'}
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
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-500 hover:text-slate-400 disabled:opacity-40"
              >
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5" />}
                Charger plus
              </button>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg border border-white/10 px-3 py-2 text-sm ${
                    mine ? 'bg-white/[0.06] text-slate-200' : 'bg-[#0a0b0e] text-slate-300'
                  }`}
                >
                  {!mine && (
                    <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {m.sender?.ea_persona_name ?? m.sender?.email ?? '…'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[9px] text-slate-600">
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {mine && mode === 'dm' && (
                      <span>{m.is_read ? 'lu' : '…'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {typingPeer && (
            <p className="pl-1 font-mono text-[11px] text-slate-600">en cours de saisie…</p>
          )}
        </div>

        <footer className="relative z-[1] flex gap-2 border-t border-white/10 p-3">
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
            className="flex-1 resize-none rounded-lg border border-white/10 bg-[#08090c] px-3 py-2 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/10"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || (mode === 'team' && !team) || (mode === 'dm' && !peerId)}
            className="inline-flex items-center gap-2 self-end rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-sm font-medium text-slate-300 hover:bg-white/[0.07] disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </footer>
      </section>
    </div>
  );
}
