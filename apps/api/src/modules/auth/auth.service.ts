import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@api/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { withWalletDefaults } from './wallet.util';

const SALT_ROUNDS = 10;
const WELCOME_COINS = 500;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

    // Créer l'utilisateur avec 500 OMJEP Coins de bienvenue
    const user = await this.prisma.user.create({
      data: {
        ...profileData,
        password_hash,
        role: dto.role ?? 'PLAYER',
        omjepCoins: WELCOME_COINS,
      },
      select: {
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
      },
    });

    // Auto-login : retourner un access_token directement
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Inscription réussie.',
      access_token,
      user: withWalletDefaults(user),
      needsOnboarding: true,
    };
  }

  async completeOnboarding(userId: string, dto: OnboardingDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferred_position: dto.preferred_position,
        nationality: dto.nationality,
        gamertag_psn: dto.gamertag_psn,
        gamertag_xbox: dto.gamertag_xbox,
      },
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        preferred_position: true,
        nationality: true,
        omjepCoins: true,
        jepyCoins: true,
        isPremium: true,
        level: true,
        xp: true,
      },
    });

    return { message: 'Profil complété avec succès !', user: withWalletDefaults(user) };
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

    const { password_hash: _hash, ...safeUser } = user;
    return withWalletDefaults(safeUser);
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
