import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { ApprovalFlowsModule } from '../approval-flows/approval-flows.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { FormDefinitionsController } from './controllers/form-definitions.controller';
import { FormDefinitionsService } from './services/form-definitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormDefinition, FormField]),
    ApprovalFlowsModule,
    AuthModule,
    GroupsModule,
    MailModule,
  ],
  controllers: [FormDefinitionsController],
  providers: [FormDefinitionsService, ApplicantAccessGuard],
  exports: [FormDefinitionsService],
})
export class FormDefinitionsModule {}
