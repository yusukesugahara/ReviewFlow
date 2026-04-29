import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { ApprovalStep } from '../../../models/entities/approval-step.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { User } from '../../../models/entities/user.entity';
import { GroupsModule } from '../groups/groups.module';
import { ApprovalFlowsController } from './approval-flows.controller';
import { ApprovalFlowsService } from './approval-flows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalFlow,
      ApprovalStep,
      FormTemplate,
      GroupMember,
      User,
    ]),
    GroupsModule,
  ],
  controllers: [ApprovalFlowsController],
  providers: [ApprovalFlowsService],
  exports: [ApprovalFlowsService],
})
export class ApprovalFlowsModule {}
