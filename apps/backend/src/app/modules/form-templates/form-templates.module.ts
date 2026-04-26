import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { Invitation } from '../../../models/entities/invitation.entity';
import { User } from '../../../models/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormTemplate, FormField, Invitation, User]),
    MailModule,
  ],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService],
})
export class FormTemplatesModule {}
