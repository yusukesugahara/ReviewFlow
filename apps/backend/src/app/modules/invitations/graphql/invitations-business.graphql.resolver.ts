import { SetMetadata } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { SKIP_JWT_KEY } from '../../../../common/constants';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
} from '../dto/invitations.dto';
import { InvitationsService } from '../services/invitations.service';

@Resolver()
export class InvitationsBusinessGraphqlResolver {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Mutation(() => GraphQLJSON, { name: 'createInvitation' })
  create(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.invitationsService.create(
      toValidatedInput(CreateInvitationDto, input),
      user,
    );
  }

  @Mutation(() => GraphQLJSON, { name: 'acceptInvitation' })
  @SetMetadata(SKIP_JWT_KEY, true)
  accept(@Args('input', { type: () => GraphQLJSON }) input: unknown) {
    return this.invitationsService.accept(
      toValidatedInput(AcceptInvitationDto, input),
    );
  }
}
