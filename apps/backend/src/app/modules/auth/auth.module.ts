import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalApiKeyGuard } from '../../guards/internal-api-key.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { JwtStrategy } from '../../../strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmailChangeToken } from '../../../models/entities/email-change-token.entity';
import { PasswordResetToken } from '../../../models/entities/password-reset-token.entity';
import { Tenant } from '../../../models/entities/tenant.entity';
import { User } from '../../../models/entities/user.entity';
import { AuthRepository } from '../../../models/repositories/auth.repository';
import { AuthController } from './controllers/auth.controller';
import { AuthEmailChangeService } from './services/email-change/auth-email-change.service';
import { AuthPasswordResetService } from './services/password-reset/auth-password-reset.service';
import { AuthService } from './services/facades/auth.service';

const jwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as NonNullable<
        JwtSignOptions['expiresIn']
      >,
    },
  }),
  inject: [ConfigService],
});

const passportModule = PassportModule.register({ defaultStrategy: 'jwt' });

@Module({
  imports: [
    UsersModule,
    MailModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([
      EmailChangeToken,
      PasswordResetToken,
      Tenant,
      User,
    ]),
    jwtModule,
    passportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailChangeService,
    AuthPasswordResetService,
    AuthRepository,
    JwtStrategy,
    { provide: APP_GUARD, useClass: InternalApiKeyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
