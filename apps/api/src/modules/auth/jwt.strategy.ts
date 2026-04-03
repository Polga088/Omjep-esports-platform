import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@api/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** Objet minimal sur `req.user` (id / email / role) — le détail cosmétique est via `GET /auth/me`. */
export type JwtRequestUser = {
  id: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'eagles_super_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtRequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token invalide ou utilisateur introuvable.');
    }

    return user;
  }
}
