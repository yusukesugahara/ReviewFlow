import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember]), UsersModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
