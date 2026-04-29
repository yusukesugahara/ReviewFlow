import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../../../models/entities/application.entity';
import { ExportJob } from '../../../models/entities/export-job.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { ExportJobsController } from './export-jobs.controller';
import { ExportJobsService } from './export-jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportJob, Application, Group, GroupMember]),
  ],
  controllers: [ExportJobsController],
  providers: [ExportJobsService],
})
export class ExportJobsModule {}
