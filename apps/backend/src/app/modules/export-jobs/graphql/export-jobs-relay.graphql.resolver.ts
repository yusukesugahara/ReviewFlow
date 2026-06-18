import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { ExportJobsService } from '../services/facades/export-jobs.service';
import { toExportJobGql } from './export-jobs.graphql.mapper';
import { ExportJobGql } from './export-jobs.graphql.types';

@Resolver()
export class ExportJobsRelayGraphqlResolver {
  constructor(private readonly exportJobs: ExportJobsService) {}

  @Query(() => ExportJobGql, {
    name: 'exportJobNode',
    description: 'CSVエクスポートジョブをRelay Node型で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async getExportJobNode(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<ExportJobGql> {
    return toExportJobGql(await this.exportJobs.getOne(actor, id));
  }
}
