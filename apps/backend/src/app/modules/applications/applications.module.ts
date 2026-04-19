import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationFieldValue,
      FormTemplate,
      ApprovalFlow,
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
