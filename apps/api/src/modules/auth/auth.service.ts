import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AvatarRarity } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { withWalletDefaults } from './wallet.util';

const SALT_ROUNDS = 10;
const WELCOME_COINS = 500;

const DICEBEAR_BOT =
  'https://api.dicebear.com/7.x/bottts/svg';

function defaultAvatarUrl(user: {
  email: string;
  ea_persona_name: string | null;
  id: string;
}): string {
  const raw =
    (user.ea_persona_name && user.ea_persona_name.trim()) ||
    user.email.split('@')[0] ||
    user.id;
  const seed = encodeURIComponent(raw);
  return `${DICEBEAR_BOT}?seed=${seed}`;
}

function mapAvatarRarityToJson(
  r: AvatarRarity,
): 'common' | 'premium' | 'legendary' {
  switch (r) {
    case AvatarRarity.PREMIUM:
      return 'premium';
    case AvatarRarity.LEGENDARY:
      return 'legendary';
    case AvatarRarity.COMMON:
    default:
      return 'common';
  }
}

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  ea_persona_name: true,
  gamertag_psn: true,
  gamertag_xbox: true,
  preferred_position: true,
  nationality: true,
  created_at: true,
  omjepCoins: true,
  jepyCoins: true,
  isPremium: true,
  level: true,
  xp: true,
  avatarUrl: true,
  avatarRarity: true,
  activeFrameUrl: true,
  activeBannerUrl: true,
  activeJerseyId: true,
} as const;

export interface PublicAuthUser {
  id: string;
  email: string;
  role: string;
  ea_persona_name: string | null;
  gamertag_psn: string | null;
  gamertag_xbox: string | null;
  preferred_position: string | null;
  nationality: string | null;
  created_at: Date;
  omjepCoins: number;
  jepyCoins: number;
  isPremium: boolean;
  level: number;
  xp: number;
  avatarUrl: string;
  avatarRarity: 'common' | 'premium' | 'legendary';
  activeFrameUrl: string | null;
  activeBannerUrl: string | null;
  activeJerseyId: string | null;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Profil JSON pour login, `/auth/me` et JWT enrichi : cosmétiques + fallback avatar + couleurs maillot.
   */
  async getPublicUser(userId: string): Promise<PublicAuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });
    if (!user) return null;

    const jersey = await this.resolveJerseyClubColors(userId, user.activeJerseyId);

    const base = withWalletDefaults({
      ...user,
      avatarUrl: user.avatarUrl ?? defaultAvatarUrl(user),
      avatarRarity: mapAvatarRarityToJson(user.avatarRarity),
    });
    return {
      ...base,
      teamPrimaryColor: jersey.primary,
      teamSecondaryColor: jersey.secondary,
    };
  }

  /** Si un maillot est équipé : couleurs du club lié à l’item, sinon du club du joueur (membership). */
  private async resolveJerseyClubColors(
    userId: string,
    activeJerseyId: string | null,
  ): Promise<{ primary?: string; secondary?: string }> {
    if (!activeJerseyId) return {};

    const item = await this.prisma.storeItem.findUnique({
      where: { id: activeJerseyId },
      select: { clubId: true },
    });

    let clubId = item?.clubId ?? null;
    if (!clubId) {
      const membership = await this.prisma.teamMember.findFirst({
        where: { user_id: userId },
        orderBy: { joined_at: 'desc' },
        select: { team_id: true },
      });
      clubId = membership?.team_id ?? null;
    }
    if (!clubId) return {};

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { primaryColor: true, secondaryColor: true },
    });
    if (!club) return {};

    const out: { primary?: string; secondary?: string } = {};
    if (club.primaryColor) out.primary = club.primaryColor;
    if (club.secondaryColor) out.secondary = club.secondaryColor;
    return out;
  }

  async register(dto: RegisterDto) {
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    if (dto.ea_persona_name) {
      const existingByPersona = await this.prisma.user.findUnique({
        where: { ea_persona_name: dto.ea_persona_name },
      });
      if (existingByPersona) {
        throw new ConflictException('Ce ea_persona_name est déjà pris.');
      }
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { password: _password, ...profileData } = dto;

    const created = await this.prisma.user.create({
      data: {
        ...profileData,
        password_hash,
        role: dto.role ?? 'PLAYER',
        omjepCoins: WELCOME_COINS,
      },
      select: { id: true },
    });

    const user = await this.getPublicUser(created.id);
    if (!user) {
      throw new ConflictException('Utilisateur créé mais profil introuvable.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Inscription réussie.',
      access_token,
      user,
      needsOnboarding: true,
    };
  }

  async completeOnboarding(userId: string, dto: OnboardingDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferred_position: dto.preferred_position,
        nationality: dto.nationality,
        gamertag_psn: dto.gamertag_psn,
        gamertag_xbox: dto.gamertag_xbox,
      },
      select: { id: true },
    });

    const user = await this.getPublicUser(userId);
    if (!user) {
      return { message: 'Profil complété.', user: null };
    }

    return { message: 'Profil complété avec succès !', user };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const publicUser = await this.getPublicUser(user.id);
    if (!publicUser) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    return publicUser;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
