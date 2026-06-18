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
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ApplicationAccessPolicy } from './policies/application-access.policy';
import { ApplicationApprovalFlowResolver } from './resolvers/application-approval-flow.resolver';
import { ApplicationActionCapabilitiesService } from './services/access/application-action-capabilities.service';
import { ApplicantApplicationAccessService } from './services/access/applicant-application-access.service';
import { ApplicantApplicationService } from './services/facades/applicant-application.service';
import { ApplicationCorrectionService } from './services/review/application-correction.service';
import { ApplicationCreationContextLoader } from './services/creation/application-creation-context.loader';
import { ApplicationCreationService } from './services/creation/application-creation.service';
import { ApplicationCreationUseCaseService } from './services/use-cases/application-creation-use-case.service';
import { ApplicationFieldValuePatchBuilder } from './services/field-values/application-field-value-patch.builder';
import { ApplicationFieldValuePatchService } from './services/field-values/application-field-value-patch.service';
import { ApplicationFieldValueTypeValidator } from './validators/application-field-value-type.validator';
import { ApplicationFormValueValidator } from './validators/application-form-value.validator';
import { ApplicationInitialFieldValueBuilder } from './services/creation/application-initial-field-value.builder';
import { ApplicationNotificationService } from './services/notifications/application-notification.service';
import { ApplicationPatchContextLoader } from './services/field-values/application-patch-context.loader';
import { ApplicationPatchPolicy } from './policies/application-patch.policy';
import { ApplicationProgressBuilder } from './services/progress/application-progress.builder';
import { ApplicationProgressService } from './services/progress/application-progress.service';
import { ApplicationQueryService } from './services/query/application-query.service';
import { ApplicationReadAccessService } from './services/access/application-read-access.service';
import { ApplicationReturnForCorrectionContextLoader } from './services/review/application-return-for-correction-context.loader';
import { ApplicationReviewActionService } from './services/review/application-review-action.service';
import { ApplicationReviewUseCaseService } from './services/use-cases/application-review-use-case.service';
import { ApplicationReturnEmailUseCaseService } from './services/notifications/application-return-email-use-case.service';
import { ApplicationSubmissionContextLoader } from './services/submission/application-submission-context.loader';
import { ApplicationSubmissionService } from './services/submission/application-submission.service';
import { ApplicationTransitionPolicy } from './policies/application-transition.policy';
import { ApplicationUserSubmissionUseCaseService } from './services/use-cases/application-user-submission-use-case.service';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/facades/applications.service';
import { PublicApplicationsController } from './controllers/public-applications.controller';
import { ApplicationGraphqlLoader } from './graphql/application.graphql.loader';
import { ApplicationsGraphqlResolver } from './graphql/applications.graphql.resolver';

@Module({
  imports: [
    AuthModule,
    AuditLogsModule,
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
    ApplicationActionCapabilitiesService,
    ApplicantApplicationAccessService,
    ApplicantApplicationService,
    ApplicationAccessPolicy,
    ApplicationApprovalFlowResolver,
    ApplicationCorrectionService,
    ApplicationCreationContextLoader,
    ApplicationCreationService,
    ApplicationCreationUseCaseService,
    ApplicationFieldValuePatchBuilder,
    ApplicationFieldValuePatchService,
    ApplicationFieldValueTypeValidator,
    ApplicationFormValueValidator,
    ApplicationInitialFieldValueBuilder,
    ApplicationNotificationService,
    ApplicationPatchContextLoader,
    ApplicationPatchPolicy,
    ApplicationProgressBuilder,
    ApplicationProgressService,
    ApplicationQueryService,
    ApplicationReadAccessService,
    ApplicationReturnForCorrectionContextLoader,
    ApplicationReviewActionService,
    ApplicationReviewUseCaseService,
    ApplicationReturnEmailUseCaseService,
    ApplicationSubmissionContextLoader,
    ApplicationSubmissionService,
    ApplicationTransitionPolicy,
    ApplicationUserSubmissionUseCaseService,
    ApplicationGraphqlLoader,
    ApplicationsGraphqlResolver,
  ],
  exports: [ApplicationGraphqlLoader],
})
export class ApplicationsModule {}
