import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../../../models/entities/application.entity';
import { ExportJob } from '../../../models/entities/export-job.entity';
import { ExportJobsRepository } from '../../../models/repositories/export-jobs.repository';
import { GroupsModule } from '../groups/groups.module';
import { ExportJobsController } from './controllers/export-jobs.controller';
import { ExportJobCsvBuilder } from './services/csv/export-job-csv.builder';
import { ExportJobFileStorage } from './services/storage/export-job-file-storage.service';
import { ExportJobsService } from './services/facades/export-jobs.service';

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
