import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationApproval } from '../../../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../../../models/entities/application-field-value.entity';
import { Application } from '../../../models/entities/application.entity';
import { CorrectionRequestItem } from '../../../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { ApprovalFlow } from '../../../models/entities/approval-flow.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { FormField } from '../../../models/entities/form-field.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { User } from '../../../models/entities/user.entity';
import { ApplicationCorrectionRepository } from '../../../models/repositories/application-correction.repository';
import { ApplicationCreationRepository } from '../../../models/repositories/application-creation.repository';
import { ApplicationProgressRepository } from '../../../models/repositories/application-progress.repository';
import { ApplicationQueryRepository } from '../../../models/repositories/application-query.repository';
import { ApplicationReviewRepository } from '../../../models/repositories/application-review.repository';
import { ApplicationSubmissionRepository } from '../../../models/repositories/application-submission.repository';
import { ApprovalFlowsRepository } from '../../../models/repositories/approval-flows.repository';
import { FormDefinitionsRepository } from '../../../models/repositories/form-definitions.repository';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApplicationAccessPolicy } from './policies/application-access.policy';
import { ApplicationApprovalFlowResolver } from './resolvers/application-approval-flow.resolver';
import { ApplicantApplicationService } from './services/applicant-application.service';
import { ApplicationCorrectionService } from './services/application-correction.service';
import { ApplicationCreationService } from './services/application-creation.service';
import { ApplicationCreationUseCaseService } from './services/application-creation-use-case.service';
import { ApplicationFieldValuePatchService } from './services/application-field-value-patch.service';
import { ApplicationFormValueValidator } from './validators/application-form-value.validator';
import { ApplicationNotificationService } from './services/application-notification.service';
import { ApplicationPatchPolicy } from './policies/application-patch.policy';
import { ApplicationProgressService } from './services/application-progress.service';
import { ApplicationQueryService } from './services/application-query.service';
import { ApplicationReviewActionService } from './services/application-review-action.service';
import { ApplicationReviewUseCaseService } from './services/application-review-use-case.service';
import { ApplicationReturnEmailUseCaseService } from './services/application-return-email-use-case.service';
import { ApplicationSubmissionService } from './services/application-submission.service';
import { ApplicationTransitionPolicy } from './policies/application-transition.policy';
import { ApplicationUserSubmissionUseCaseService } from './services/application-user-submission-use-case.service';
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
      FormField,
      ApprovalFlow,
      GroupMember,
      User,
    ]),
  ],
  controllers: [ApplicationsController, PublicApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationCorrectionRepository,
    ApplicationCreationRepository,
    ApplicationProgressRepository,
    ApplicationQueryRepository,
    ApplicationReviewRepository,
    ApplicationSubmissionRepository,
    ApprovalFlowsRepository,
    FormDefinitionsRepository,
    ApplicantAccessGuard,
    ApplicantApplicationService,
    ApplicationAccessPolicy,
    ApplicationApprovalFlowResolver,
    ApplicationCorrectionService,
    ApplicationCreationService,
    ApplicationCreationUseCaseService,
    ApplicationFieldValuePatchService,
    ApplicationFormValueValidator,
    ApplicationNotificationService,
    ApplicationPatchPolicy,
    ApplicationProgressService,
    ApplicationQueryService,
    ApplicationReviewActionService,
    ApplicationReviewUseCaseService,
    ApplicationReturnEmailUseCaseService,
    ApplicationSubmissionService,
    ApplicationTransitionPolicy,
    ApplicationUserSubmissionUseCaseService,
  ],
})
export class ApplicationsModule {}
