import PlayerIdentity, { type PlayerIdentityRarity } from '@/components/PlayerIdentity';

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

/** Mini PlayerIdentity pour la liste contacts — cadre Royal Eagle + lueur si Légendaire */
export function ChatContactAvatar({ contact }: { contact: ChatContactRow }) {
  const rarity = toRarity(contact.avatarRarity ?? undefined);
  const initial = (contact.ea_persona_name || contact.email || '?').slice(0, 1).toUpperCase();
  const frameUrl = contact.activeFrameUrl?.trim() || null;
  const legendary = rarity === 'legendary';

  const label = contact.ea_persona_name || contact.email || 'Contact';

  return (
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
  );
}
