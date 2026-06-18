import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { connectionFromNodes } from '../../../../common/graphql/relay-pagination';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { FormDefinitionsService } from '../services/facades/form-definitions.service';
import { toFormDefinitionGql } from './form-definitions.graphql.mapper';
import {
  FormDefinitionConnectionGql,
  FormDefinitionGql,
} from './form-definitions.graphql.types';

@Resolver()
export class FormDefinitionsRelayGraphqlResolver {
  constructor(private readonly formDefinitions: FormDefinitionsService) {}

  @Query(() => FormDefinitionConnectionGql, {
    name: 'formDefinitionsConnection',
    description: 'space内のフォーム定義一覧をRelay Connection形式で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async listFormDefinitionsConnection(
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('includeArchived', { type: () => Boolean, nullable: true })
    includeArchived: boolean | null,
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<FormDefinitionConnectionGql> {
    const rows = await this.formDefinitions.listByGroup(
      actor,
      groupId,
      includeArchived === true,
    );
    const nodes = rows.map((row) =>
      toFormDefinitionGql(this.formDefinitions.toResponse(row)),
    );
    return connectionFromNodes({ after, first, nodes });
  }

  @Query(() => FormDefinitionGql, {
    name: 'formDefinitionNode',
    description: 'フォーム定義をRelay Node型で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  async getFormDefinitionNode(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<FormDefinitionGql> {
    const row = await this.formDefinitions.getOneForActor(actor, id);
    return toFormDefinitionGql(this.formDefinitions.toResponse(row));
  }
}
