import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../../../models/entities/application.entity';
import { ExportJob } from '../../../models/entities/export-job.entity';
import { ExportJobsRepository } from '../../../models/repositories/export-jobs.repository';
import { GroupsModule } from '../groups/groups.module';
import { ExportJobsController } from './controllers/export-jobs.controller';
import { ExportJobCsvBuilder } from './services/export-job-csv.builder';
import { ExportJobFileStorage } from './services/export-job-file-storage.service';
import { ExportJobsService } from './services/export-jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExportJob, Application]), GroupsModule],
  controllers: [ExportJobsController],
  providers: [
    ExportJobsService,
    ExportJobCsvBuilder,
    ExportJobFileStorage,
    ExportJobsRepository,
  ],
})
export class ExportJobsModule {}
