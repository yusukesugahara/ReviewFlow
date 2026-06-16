import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { FormDefinition } from '../entities/form-definition.entity';

@Injectable()
export class FormDefinitionsRepository {
  constructor(
    @InjectRepository(FormDefinition)
    private readonly definitions: Repository<FormDefinition>,
  ) {}

  listByGroup(params: {
    tenantId: string;
    groupId: string;
    includeArchived: boolean;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        ...(params.includeArchived
          ? { status: FormDefinitionStatus.ARCHIVED }
          : { status: Not(FormDefinitionStatus.ARCHIVED) }),
      },
      relations: ['fields'],
      order: { updatedAt: 'DESC', fields: { sortOrder: 'ASC' } },
    });
  }

  findOneByGroup(params: {
    tenantId: string;
    groupId: string;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: { tenantId: params.tenantId, groupId: params.groupId },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
  }

  createDefinition(params: {
    tenantId: string;
    groupId: string;
    name: string;
    description: string | null;
    createdByUserId: string;
  }): Promise<FormDefinition> {
    return this.definitions.save(
      this.definitions.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        name: params.name,
        description: params.description,
        status: FormDefinitionStatus.DRAFT,
        createdByUserId: params.createdByUserId,
      }),
    );
  }

  findByIdWithFieldsInTenant(
    tenantId: string,
    definitionId: string,
  ): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: { id: definitionId, tenantId },
      relations: ['fields'],
    });
  }

  findTemplateByIdInGroup(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId: string;
    onlyPublished?: boolean;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: {
        id: params.formDefinitionId,
        tenantId: params.tenantId,
        groupId: params.groupId,
        ...(params.onlyPublished
          ? { status: FormDefinitionStatus.PUBLISHED }
          : {}),
      },
      relations: ['fields'],
    });
  }

  findPublishedTemplatesForApplicationCreation(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  }

  saveDefinition(definition: FormDefinition): Promise<FormDefinition> {
    return this.definitions.save(definition);
  }

  findPublishedForApplicant(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition | null> {
    return this.definitions.findOne({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
  }

  findPublishedForAccessRequest(params: {
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition[]> {
    return this.definitions.find({
      where: {
        ...(params.formDefinitionId ? { id: params.formDefinitionId } : {}),
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
    });
  }
}
