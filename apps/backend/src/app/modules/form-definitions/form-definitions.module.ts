import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../models/repositories/form-definitions.repository';
import { FormFieldsRepository } from '../../../models/repositories/form-fields.repository';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApprovalFlowsModule } from '../approval-flows/approval-flows.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { FormDefinitionsController } from './controllers/form-definitions.controller';
import { FormAccessRequestService } from './services/access-requests/form-access-request.service';
import { FormDefinitionCreationService } from './services/creation/form-definition-creation.service';
import { FormDefinitionFieldsService } from './services/fields/form-definition-fields.service';
import { FormDefinitionLifecycleService } from './services/lifecycle/form-definition-lifecycle.service';
import { FormDefinitionQueryService } from './services/query/form-definition-query.service';
import { FormDefinitionsService } from './services/facades/form-definitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormDefinition, FormField]),
    ApprovalFlowsModule,
    AuthModule,
    GroupsModule,
    MailModule,
  ],
  controllers: [FormDefinitionsController],
  providers: [
    FormDefinitionsService,
    FormAccessRequestService,
    FormDefinitionCreationService,
    FormDefinitionFieldsService,
    FormDefinitionLifecycleService,
    FormDefinitionQueryService,
    FormDefinitionsRepository,
    FormFieldsRepository,
    ApplicantAccessGuard,
  ],
  exports: [FormDefinitionsService],
})
export class FormDefinitionsModule {}
