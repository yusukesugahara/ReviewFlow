import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { UsersService } from '../users/users.service';
import type { LoginDto, RegisterDto } from './auth.dto';
import type { AccessTokenPayload } from '../../../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const isFirstUser = (await this.usersService.count()) === 0;
    const role = isFirstUser ? 'admin' : 'user';
    const user = await this.usersService.create(dto.email, passwordHash, role);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  private issueTokens(userId: string, email: string, role: string) {
    const payload: AccessTokenPayload = { sub: userId, email, role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: userId, email, role },
    };
  }
}
