import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { Invitation } from '../../../models/entities/invitation.entity';
import { User } from '../../../models/entities/user.entity';
import { InvitationsRepository } from '../../../models/repositories/invitations.repository';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { InvitationsController } from './controllers/invitations.controller';
import { InvitationsBusinessGraphqlResolver } from './graphql/invitations-business.graphql.resolver';
import { InvitationsService } from './services/invitations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, User, Group, GroupMember]),
    AuditLogsModule,
    UsersModule,
    AuthModule,
    MailModule,
  ],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationsBusinessGraphqlResolver,
    InvitationsRepository,
  ],
})
export class InvitationsModule {}
