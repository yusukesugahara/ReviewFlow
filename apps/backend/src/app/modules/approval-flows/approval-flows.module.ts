import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../models/entities/approval-step.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { User } from '../../../models/entities/user.entity';
import { ApprovalFlowsController } from './approval-flows.controller';
import { ApprovalFlowsService } from './approval-flows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalFlow, ApprovalStep, FormTemplate, User]),
  ],
  controllers: [ApprovalFlowsController],
  providers: [ApprovalFlowsService],
  exports: [ApprovalFlowsService],
})
export class ApprovalFlowsModule {}
