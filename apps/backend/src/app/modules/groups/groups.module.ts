import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { User } from '../../../models/entities/user.entity';
import { GroupsRepository } from '../../../models/repositories/groups.repository';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './controllers/groups.controller';
import { GroupMembersService } from './services/members/group-members.service';
import { GroupsService } from './services/facades/groups.service';
import { SpaceAccessService } from './services/access/space-access.service';
import { TransactionService } from '../../transaction';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, User]),
    AuditLogsModule,
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupMembersService,
    SpaceAccessService,
    GroupsRepository,
    TransactionService,
  ],
  exports: [GroupsService, SpaceAccessService],
})
export class GroupsModule {}
