import PlayerIdentity, { type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import RankBadge from '@/components/RankBadge';

export type ChatContactRow = {
  id: string;
  email: string;
  ea_persona_name: string | null;
  role: string;
  level?: number;
  avatarUrl?: string | null;
  avatarRarity?: string | null;
  activeFrameUrl?: string | null;
  activeJerseyId?: string | null;
};

function toRarity(raw: string | null | undefined): PlayerIdentityRarity {
  switch (raw?.toUpperCase()) {
    case 'LEGENDARY':
      return 'legendary';
    case 'PREMIUM':
      return 'premium';
    default:
      return 'common';
  }
}

/** Mini PlayerIdentity + RankBadge — tolère `contact` absent au premier rendu */
export function ChatContactAvatar({
  contact,
  terminal,
}: {
  contact?: ChatContactRow | null;
  /** Sans lueurs / halo — liste chat mode terminal */
  terminal?: boolean;
}) {
  const level = contact?.level ?? 1;

  if (!contact) {
    return (
      <div className="flex shrink-0 items-center gap-2" aria-hidden>
        <div className="h-[52px] w-[52px] rounded-full bg-white/10" />
        <div className="h-8 w-10 rounded-md bg-white/10" />
      </div>
    );
  }

  const rarity = toRarity(contact.avatarRarity ?? undefined);
  const initial = (contact.ea_persona_name || contact.email || '?').slice(0, 1).toUpperCase();
  const frameUrl = contact.activeFrameUrl?.trim() || null;
  const legendary = rarity === 'legendary' && !terminal;

  const label = contact.ea_persona_name || contact.email || 'Contact';

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        className={`relative flex h-[52px] w-[52px] shrink-0 items-center justify-center ${legendary ? 'rounded-full [filter:drop-shadow(0_0_8px_rgba(251,191,36,0.48))_drop-shadow(0_0_18px_rgba(234,179,8,0.2))]' : ''}`}
      >
        <div
          className={`origin-center scale-[0.68] ${legendary ? 'rounded-full ring-1 ring-amber-400/40 ring-offset-2 ring-offset-transparent' : ''}`}
        >
          <PlayerIdentity
            size="sm"
            initial={initial}
            avatarUrl={contact.avatarUrl?.trim() || undefined}
            rarity={rarity}
            activeFrameUrl={frameUrl}
            royalEagleFrame={!frameUrl && legendary}
            activeJerseyId={contact.activeJerseyId?.trim() || undefined}
            imgAlt={label}
          />
        </div>
      </div>
      <RankBadge level={level} size="sm" showLabel={false} className="shrink-0" />
    </div>
  );
}
