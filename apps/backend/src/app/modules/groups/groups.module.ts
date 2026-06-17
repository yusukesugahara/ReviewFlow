import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { User } from '../../../models/entities/user.entity';
import { GroupsRepository } from '../../../models/repositories/groups.repository';
import { SpaceDashboardRepository } from '../../../models/repositories/space-dashboard.repository';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './controllers/groups.controller';
import { SpaceDashboardService } from './services/dashboard/space-dashboard.service';
import { GroupMembersService } from './services/members/group-members.service';
import { GroupsService } from './services/facades/groups.service';
import { SpaceAccessService } from './services/access/space-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, User]),
    AuditLogsModule,
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    SpaceDashboardService,
    GroupMembersService,
    SpaceAccessService,
    GroupsRepository,
    SpaceDashboardRepository,
  ],
  exports: [GroupsService, SpaceAccessService],
})
export class GroupsModule {}
