import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApprovalFlowsModule } from '../approval-flows/approval-flows.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormTemplate, FormField]),
    ApprovalFlowsModule,
    AuthModule,
    GroupsModule,
    MailModule,
  ],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService, ApplicantAccessGuard],
  exports: [FormTemplatesService],
})
export class FormTemplatesModule {}
