import { ParseUUIDPipe, SetMetadata, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
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
import { ApplicantAccessGuard } from '../../../guards/applicant-access.guard';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import {
  ApproveApplicationDto,
  CreateApplicationDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { ApplicationsService } from '../services/facades/applications.service';
import { ApplicationGraphqlLoader } from './application.graphql.loader';
import {
  ApplicationSummaryConnectionGql,
  ApplicationCorrectionGql,
  ApplicationCorrectionTargetsGql,
  ApplicationDetailGql,
  ApplicationSummaryGql,
} from './application.graphql.types';

@Resolver()
export class ApplicationsGraphqlResolver {
  constructor(
    private readonly loader: ApplicationGraphqlLoader,
    private readonly applications: ApplicationsService,
  ) {}

  @Query(() => [ApplicationSummaryGql], {
    name: 'applications',
    description: 'ログインユーザーが閲覧できる申請一覧を返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  listApplications(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApplicationSummaryGql[]> {
    return this.loader.listApplications(actor, groupId);
  }

  @Query(() => ApplicationSummaryConnectionGql, {
    name: 'applicationsConnection',
    description:
      'ログインユーザーが閲覧できる申請一覧をRelay Connection形式で返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async listApplicationsConnection(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApplicationSummaryConnectionGql> {
    return this.loader.listApplicationsConnection({
      actor,
      after,
      first,
      groupId,
    });
  }

  @Query(() => ApplicationDetailGql, {
    name: 'application',
    description: 'ログインユーザーが閲覧できる申請詳細を返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  getApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApplicationDetailGql> {
    return this.loader.getApplication(actor, id);
  }

  @Query(() => [ApplicationCorrectionGql], {
    name: 'applicationCorrections',
    description: 'ログインユーザーが閲覧できる申請の差し戻し履歴を返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  listApplicationCorrections(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApplicationCorrectionGql[]> {
    return this.loader.listCorrections(actor, id);
  }

  @Query(() => ApplicationCorrectionTargetsGql, {
    name: 'applicationCorrectionTargets',
    description: 'ログインユーザーが閲覧できる申請の差し戻し修正対象を返す。',
  })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  getApplicationCorrectionTargets(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ApplicationCorrectionTargetsGql> {
    return this.loader.getCorrectionTargets(actor, id);
  }

  @Mutation(() => GraphQLJSON, { name: 'createApplication' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async createApplication(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.create(
      actor,
      toValidatedInput(CreateApplicationDto, input),
    );
    return { id: row.id, status: row.status };
  }

  @Mutation(() => GraphQLJSON, { name: 'submitApplication' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async submitApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.submit(actor, id);
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'approveApplication' })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async approveApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.approve(
      actor,
      id,
      toValidatedInput(ApproveApplicationDto, input),
    );
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'returnApplication' })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async returnApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.returnApplication(
      actor,
      id,
      toValidatedInput(ReturnApplicationDto, input),
    );
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'resendReturnEmail' })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async resendReturnEmail(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.resendReturnEmail(actor, id);
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'rejectApplication' })
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  async rejectApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.reject(
      actor,
      id,
      toValidatedInput(RejectApplicationDto, input),
    );
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'resubmitApplication' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async resubmitApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.resubmit(actor, id);
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'patchApplication' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async patchApplication(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const row = await this.applications.patch(
      actor,
      id,
      toValidatedInput(PatchApplicationDto, input),
    );
    return this.applications.toDetailForActor(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'createPublicApplication' })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  async createPublicApplication(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
  ) {
    const row = await this.applications.createAndSubmitForApplicant(
      actor,
      toValidatedInput(CreatePublicApplicationDto, input),
    );
    return this.applications.toDetailForApplicant(row, actor);
  }

  @Query(() => GraphQLJSON, {
    name: 'returnedApplicationCorrectionTargetsForApplicant',
  })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  getReturnedCurrentForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ) {
    return this.applications.getReturnedCorrectionForApplicant(actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'patchReturnedApplication' })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  async patchReturnedApplication(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
  ) {
    const row = await this.applications.patchReturnedForApplicant(
      actor,
      id,
      toValidatedInput(PatchApplicationDto, input),
    );
    return this.applications.toDetailForApplicant(row, actor);
  }

  @Mutation(() => GraphQLJSON, { name: 'resubmitReturnedApplication' })
  @SetMetadata(SKIP_JWT_KEY, true)
  @UseGuards(ApplicantAccessGuard)
  async resubmitReturnedApplication(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ) {
    const row = await this.applications.resubmitForApplicant(actor, id);
    return this.applications.toDetailForApplicant(row, actor);
  }
}
