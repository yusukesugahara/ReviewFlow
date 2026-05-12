import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { ApplicationAccessPolicy } from './application-access.policy';
import { ApplicationFormValueValidator } from './application-form-value.validator';
import { ApplicationTransitionPolicy } from './application-transition.policy';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [
    AuthModule,
    GroupsModule,
    TypeOrmModule.forFeature([
      Application,
      ApplicationApproval,
      ApplicationFieldValue,
      CorrectionRequest,
      CorrectionRequestItem,
      FormDefinition,
      ApprovalFlow,
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationAccessPolicy,
    ApplicationFormValueValidator,
    ApplicationTransitionPolicy,
  ],
})
export class ApplicationsModule {}
