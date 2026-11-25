import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { appLogger } from '../telemetry/app-logger';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithHash(email.toLowerCase());
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !ok) {
      appLogger.event('warn', 'Intento de login fallido', { email, event: 'login_failed' });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    appLogger.event('info', 'Login exitoso', { user_id: user.id, role: user.role, event: 'login_ok' });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
