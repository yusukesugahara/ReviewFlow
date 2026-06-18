import { ParseUUIDPipe, SetMetadata, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { SKIP_JWT_KEY } from '../../../../common/constants';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import { CurrentApplicantSession } from '../../../../decorators/current-applicant-session.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import { ApplicantAccessGuard } from '../../../guards/applicant-access.guard';
import { ApprovalFlowsService } from '../../approval-flows/services/approval-flows.service';
import {
  CreateFormDefinitionDto,
  CreateFormFieldDto,
  MoveFormFieldDto,
  RequestFormAccessDto,
  UpdateFormDefinitionDescriptionDto,
  UpdateFormFieldSettingsDto,
} from '../dto/form-definitions.dto';
import { FormDefinitionsService } from '../services/facades/form-definitions.service';

@Resolver()
export class FormDefinitionsBusinessGraphqlResolver {
  constructor(
    private readonly formDefinitions: FormDefinitionsService,
    private readonly approvalFlows: ApprovalFlowsService,
  ) {}

  @Query(() => GraphQLJSON, { name: 'formDefinitions' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async list(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('includeArchived', { type: () => Boolean, nullable: true })
    includeArchived: boolean | null,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const rows = await this.formDefinitions.listByGroup(
      actor,
      groupId,
      includeArchived === true,
    );
    return {
      definitions: rows.map((row) => this.formDefinitions.toResponse(row)),
    };
  }

  @Query(() => GraphQLJSON, { name: 'currentFormDefinitionForApplicant' })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  async getCurrentForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ) {
    const row =
      await this.formDefinitions.getPublishedDefinitionForApplicant(actor);
    return this.formDefinitions.toResponse(row);
  }

  @Query(() => GraphQLJSON, { name: 'currentApprovalFlowsForApplicant' })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  async listCurrentFlowsForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ) {
    const rows = await this.approvalFlows.listActiveForApplicant(actor);
    return { flows: rows.map((row) => this.approvalFlows.toDto(row)) };
  }

  @Query(() => GraphQLJSON, { name: 'formDefinition' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async getOne(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.formDefinitions.getOneForActor(actor, id);
    return this.formDefinitions.toResponse(row);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateFormDefinitionDescription' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async updateDescription(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.formDefinitions.updateDescription(
      actor,
      id,
      toValidatedInput(UpdateFormDefinitionDescriptionDto, input),
    );
    return this.formDefinitions.toResponse(row);
  }

  @Mutation(() => GraphQLJSON, { name: 'createFormDefinition' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async create(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const saved = await this.formDefinitions.create(
      actor,
      toValidatedInput(CreateFormDefinitionDto, input),
    );
    const full = await this.formDefinitions.getOne(actor.tenantId, saved.id);
    return this.formDefinitions.toResponse(full);
  }

  @Mutation(() => GraphQLJSON, { name: 'addFormField' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async addField(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const field = await this.formDefinitions.addField(
      actor,
      id,
      toValidatedInput(CreateFormFieldDto, input),
    );
    return this.formDefinitions.fieldToDto(field);
  }

  @Mutation(() => GraphQLJSON, { name: 'moveFormField' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async moveField(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('fieldId', { type: () => ID }, ParseUUIDPipe) fieldId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const dto = toValidatedInput(MoveFormFieldDto, input);
    await this.formDefinitions.moveField(actor, id, fieldId, dto.direction);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return this.formDefinitions.toResponse(full);
  }

  @Mutation(() => GraphQLJSON, { name: 'deleteFormField' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async deleteField(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('fieldId', { type: () => ID }, ParseUUIDPipe) fieldId: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.formDefinitions.deleteField(actor, id, fieldId);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return this.formDefinitions.toResponse(full);
  }

  @Mutation(() => GraphQLJSON, { name: 'updateFormFieldSettings' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async updateFieldSettings(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('fieldId', { type: () => ID }, ParseUUIDPipe) fieldId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.formDefinitions.updateFieldSettings(
      actor,
      id,
      fieldId,
      toValidatedInput(UpdateFormFieldSettingsDto, input),
    );
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return this.formDefinitions.toResponse(full);
  }

  @Mutation(() => GraphQLJSON, { name: 'publishFormDefinition' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async publish(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.formDefinitions.publish(actor, id);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return this.formDefinitions.toResponse(full);
  }

  @Mutation(() => GraphQLJSON, { name: 'archiveFormDefinition' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async archive(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.formDefinitions.archive(actor, id);
    return this.formDefinitions.toResponse(row);
  }

  @Mutation(() => GraphQLJSON, { name: 'restoreFormDefinition' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async restore(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.formDefinitions.restore(actor, id);
    return this.formDefinitions.toResponse(row);
  }

  @Mutation(() => GraphQLJSON, { name: 'requestFormAccess' })
  @SetMetadata(SKIP_JWT_KEY, true)
  requestAccess(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @Args('formDefinitionId', { type: () => ID, nullable: true })
    formDefinitionId?: string | null,
  ) {
    return this.formDefinitions.requestAccess(
      groupId,
      toValidatedInput(RequestFormAccessDto, input),
      formDefinitionId ?? undefined,
    );
  }
}
