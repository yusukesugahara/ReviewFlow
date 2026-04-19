import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormField } from '../../../models/entities/form-field.entity';
import { FormTemplate } from '../../../models/entities/form-template.entity';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormTemplate, FormField])],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService],
})
export class FormTemplatesModule {}
