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
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApplicationAccessPolicy } from './application-access.policy';
import { ApplicationFieldValuePatchService } from './application-field-value-patch.service';
import { ApplicationFormValueValidator } from './application-form-value.validator';
import { ApplicationProgressService } from './application-progress.service';
import { ApplicationTransitionPolicy } from './application-transition.policy';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { PublicApplicationsController } from './public-applications.controller';

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
    ApplicantAccessGuard,
    ApplicationAccessPolicy,
    ApplicationFieldValuePatchService,
    ApplicationFormValueValidator,
    ApplicationProgressService,
    ApplicationTransitionPolicy,
  ],
})
export class ApplicationsModule {}
