/** Payload émis par le serveur pour un nouveau message (hors Prisma). */
export interface ChatMessagePayload {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  team_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    email: string;
    ea_persona_name: string | null;
  };
}

export interface ChatTypingPayload {
  userId: string;
  teamId?: string | null;
  peerId?: string | null;
  isTyping: boolean;
}

export interface ChatPresencePayload {
  userId: string;
  online: boolean;
  role?: string;
}
