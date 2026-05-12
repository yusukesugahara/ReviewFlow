import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormDefinition } from '../../../models/entities/form-definition.entity';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MailModule } from '../mail/mail.module';
import { FormDefinitionsController } from './form-definitions.controller';
import { FormDefinitionsService } from './form-definitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormDefinition, FormField]),
    AuthModule,
    GroupsModule,
    MailModule,
  ],
  controllers: [FormDefinitionsController],
  providers: [FormDefinitionsService],
  exports: [FormDefinitionsService],
})
export class FormDefinitionsModule {}
