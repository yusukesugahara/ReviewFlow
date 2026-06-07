import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './controllers/groups.controller';
import { GroupsService } from './services/groups.service';
import { SpaceAccessService } from './services/space-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember]), UsersModule],
  controllers: [GroupsController],
  providers: [GroupsService, SpaceAccessService],
  exports: [GroupsService, SpaceAccessService],
})
export class GroupsModule {}
