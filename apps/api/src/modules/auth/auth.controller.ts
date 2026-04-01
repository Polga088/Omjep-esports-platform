import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: { user: unknown }) {
    return req.user;
  }

  /** Complète le profil après l'inscription (poste, nationalité, gamertags) */
  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Request() req: { user: { id: string } },
    @Body() dto: OnboardingDto,
  ) {
    return this.authService.completeOnboarding(req.user.id, dto);
  }
}
