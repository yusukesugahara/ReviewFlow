import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApplicationAccessPolicy } from './application-access.policy';
import { ApplicationFormValueValidator } from './application-form-value.validator';
import { ApplicationTransitionPolicy } from './application-transition.policy';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { PublicApplicationsController } from './public-applications.controller';

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
      FormTemplate,
      ApprovalFlow,
    ]),
  ],
  controllers: [ApplicationsController, PublicApplicationsController],
  providers: [
    ApplicationsService,
    ApplicantAccessGuard,
    ApplicationAccessPolicy,
    ApplicationFormValueValidator,
    ApplicationTransitionPolicy,
  ],
})
export class ApplicationsModule {}
