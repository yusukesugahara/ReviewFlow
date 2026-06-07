import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClientErrorCodes, clientError } from '../common/errors';
import { UsersService } from '../app/modules/users/services/users.service';

/*
 * JWT 認証戦略
 *
 * 必要があれば下記検討を行う。
 * - nestのjwt認証を試用しているが、ログアウト時にトークンを無効化することができない。
 * - ログアウト時にトークンを無効化するためには、トークンをデータベースに保存しておく必要がある。
 */

/** Nest が発行する access token のペイロード */
export type AccessTokenPayload = {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || user.email !== payload.email) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    if (user.role !== payload.role) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    if (user.tenantId !== payload.tenantId) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: [user.role],
    };
  }
}
