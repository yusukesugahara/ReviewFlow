import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { CreateExportJobDto } from '../dto/export-jobs.dto';
import { ExportJobsService } from '../services/facades/export-jobs.service';

@Resolver()
export class ExportJobsBusinessGraphqlResolver {
  constructor(private readonly exportJobs: ExportJobsService) {}

  @Mutation(() => GraphQLJSON, { name: 'createExportJob' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  create(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.exportJobs.create(
      actor,
      toValidatedInput(CreateExportJobDto, input),
    );
  }

  @Query(() => GraphQLJSON, { name: 'exportJob' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  getOne(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.exportJobs.getOne(actor, id);
  }
}
