import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAT_MESSAGES_PAGE_SIZE,
  type ChatMessagePayload,
} from '@omjep/shared';
import api from '@/lib/api';
import { Loader2, MessageCircle, Send, Users, ChevronUp } from 'lucide-react';
import { useChatSocket } from './useChatSocket';

type Me = { id: string; email: string; role?: string };
type Contact = { id: string; email: string; ea_persona_name: string | null; role: string };
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
  const { socket, connected: socketConnected } = useChatSocket(me.id);
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
    if (!s || !socketConnected) return;
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
  }, [mode, team?.id, socketConnected, loadTeamMessages, socket]);

  useEffect(() => {
    const s = socket;
    if (!s || !socketConnected || mode !== 'dm' || !peerId) return;
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
  }, [mode, peerId, socketConnected, loadDmMessages, me.id, socket]);

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

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 min-h-[70vh]">
      <aside className="rounded-2xl border border-amber-500/15 bg-[#070a12] p-4 space-y-4">
        <div className="flex items-center gap-2 text-amber-400/90">
          <Users className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Contacts</span>
        </div>
        {team && (
          <button
            type="button"
            onClick={() => {
              setMode('team');
              setPeerId(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors ${
              mode === 'team'
                ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                : 'border-white/5 text-slate-400 hover:border-amber-500/20'
            }`}
          >
            Salon · {team.name}
          </button>
        )}
        <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
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
                className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors flex items-center gap-2 ${
                  mode === 'dm' && peerId === c.id
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                    : 'border-white/5 text-slate-400 hover:border-amber-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`}
                />
                <span className="truncate">{c.ea_persona_name ?? c.email}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          {CHAT_MESSAGES_PAGE_SIZE} derniers messages par chargement — bouton « Charger plus » pour l’historique.
        </p>
      </aside>

      <section className="flex flex-col rounded-2xl border border-amber-500/15 bg-gradient-to-b from-[#0a0f18] to-[#060910] min-h-[420px]">
        <header className="px-4 py-3 border-b border-amber-500/10 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white">
            {mode === 'team' && team ? `Salon ${team.name}` : mode === 'dm' && peerId ? `MP · ${peerLabel}` : 'Conversation'}
          </h2>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold ${
              socketConnected ? 'text-emerald-400' : 'text-amber-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                socketConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]' : 'bg-amber-500/60 animate-pulse'
              }`}
              aria-hidden
            />
            {socketConnected ? 'En ligne' : 'Connexion…'}
          </span>
        </header>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[50vh]"
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
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm border ${
                    mine
                      ? 'bg-amber-500/15 border-amber-500/25 text-amber-50'
                      : 'bg-white/[0.04] border-white/10 text-slate-200'
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] text-amber-500/80 font-semibold mb-1">
                      {m.sender?.ea_persona_name ?? m.sender?.email ?? '…'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div className="flex items-center justify-end gap-2 mt-1 text-[9px] text-slate-500">
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
            <p className="text-[11px] text-amber-500/70 italic pl-1">En train d’écrire…</p>
          )}
        </div>

        <footer className="p-3 border-t border-amber-500/10 flex gap-2">
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
            className="flex-1 rounded-xl bg-black/30 border border-white/10 text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || (mode === 'team' && !team) || (mode === 'dm' && !peerId)}
            className="self-end px-4 py-2 rounded-xl bg-amber-500 text-[#0a0a0a] font-bold text-sm hover:bg-amber-400 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </footer>
      </section>
    </div>
  );
}
