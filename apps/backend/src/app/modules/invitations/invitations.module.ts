import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from '../../../models/entities/invitation.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { InvitationsController } from './controllers/invitations.controller';
import { InvitationsService } from './services/invitations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    UsersModule,
    AuthModule,
    MailModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
