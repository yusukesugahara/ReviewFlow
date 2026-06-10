import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { User } from '../../../models/entities/user.entity';
import { ApplicationsRepository } from '../../../models/repositories/applications.repository';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApplicationAccessPolicy } from './policies/application-access.policy';
import { ApplicationApprovalFlowResolver } from './resolvers/application-approval-flow.resolver';
import { ApplicationCorrectionService } from './services/application-correction.service';
import { ApplicationCreationService } from './services/application-creation.service';
import { ApplicationFieldValuePatchService } from './services/application-field-value-patch.service';
import { ApplicationFormValueValidator } from './validators/application-form-value.validator';
import { ApplicationProgressService } from './services/application-progress.service';
import { ApplicationQueryService } from './services/application-query.service';
import { ApplicationReviewActionService } from './services/application-review-action.service';
import { ApplicationSubmissionService } from './services/application-submission.service';
import { ApplicationTransitionPolicy } from './policies/application-transition.policy';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';
import { PublicApplicationsController } from './controllers/public-applications.controller';

@Module({
  imports: [
    AuthModule,
    GroupsModule,
    MailModule,
    TypeOrmModule.forFeature([
      Application,
      ApplicationApproval,
      ApplicationFieldValue,
      CorrectionRequest,
      CorrectionRequestItem,
      FormDefinition,
      ApprovalFlow,
      User,
    ]),
  ],
  controllers: [ApplicationsController, PublicApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationsRepository,
    ApplicantAccessGuard,
    ApplicationAccessPolicy,
    ApplicationApprovalFlowResolver,
    ApplicationCorrectionService,
    ApplicationCreationService,
    ApplicationFieldValuePatchService,
    ApplicationFormValueValidator,
    ApplicationProgressService,
    ApplicationQueryService,
    ApplicationReviewActionService,
    ApplicationSubmissionService,
    ApplicationTransitionPolicy,
  ],
})
export class ApplicationsModule {}
