import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApprovalFlowsModule } from '../approval-flows/approval-flows.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormTemplate, FormField, Group, GroupMember]),
    ApprovalFlowsModule,
    AuthModule,
    MailModule,
  ],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService, ApplicantAccessGuard],
  exports: [FormTemplatesService],
})
export class FormTemplatesModule {}
