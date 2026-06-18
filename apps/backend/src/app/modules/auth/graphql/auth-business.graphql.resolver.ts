import { SetMetadata } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { SKIP_JWT_KEY } from '../../../../common/constants';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import {
  ConfirmEmailChangeDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestMeEmailChangeDto,
  RequestPasswordResetDto,
  UpdateMePasswordDto,
  UpdateMeProfileDto,
} from '../dto/auth.dto';
import { AuthService } from '../services/facades/auth.service';

@Resolver()
export class AuthBusinessGraphqlResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => GraphQLJSON, { name: 'register' })
  @SetMetadata(SKIP_JWT_KEY, true)
  register(@Args('input', { type: () => GraphQLJSON }) input: unknown) {
    return this.authService.register(toValidatedInput(RegisterDto, input));
  }

  @Mutation(() => GraphQLJSON, { name: 'login' })
  @SetMetadata(SKIP_JWT_KEY, true)
  login(@Args('input', { type: () => GraphQLJSON }) input: unknown) {
    return this.authService.login(toValidatedInput(LoginDto, input));
  }

  @Mutation(() => GraphQLJSON, { name: 'requestPasswordReset' })
  @SetMetadata(SKIP_JWT_KEY, true)
  requestPasswordReset(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
  ) {
    return this.authService.requestPasswordReset(
      toValidatedInput(RequestPasswordResetDto, input),
    );
  }

  @Mutation(() => GraphQLJSON, { name: 'confirmPasswordReset' })
  @SetMetadata(SKIP_JWT_KEY, true)
  confirmPasswordReset(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
  ) {
    return this.authService.confirmPasswordReset(
      toValidatedInput(ConfirmPasswordResetDto, input),
    );
  }

  @Query(() => GraphQLJSON, { name: 'me' })
  me(@CurrentUser() user: AuthUserPayload) {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      roles: user.roles,
      tenantId: user.tenantId,
    };
  }

  @Mutation(() => GraphQLJSON, { name: 'updateMeProfile' })
  updateMeProfile(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.authService.updateMeProfile(
      toValidatedInput(UpdateMeProfileDto, input),
      user,
    );
  }

  @Mutation(() => GraphQLJSON, { name: 'requestMeEmailChange' })
  requestMeEmailChange(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.authService.requestMeEmailChange(
      toValidatedInput(RequestMeEmailChangeDto, input),
      user,
    );
  }

  @Mutation(() => GraphQLJSON, { name: 'confirmEmailChange' })
  @SetMetadata(SKIP_JWT_KEY, true)
  confirmEmailChange(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
  ) {
    return this.authService.confirmEmailChange(
      toValidatedInput(ConfirmEmailChangeDto, input),
    );
  }

  @Mutation(() => GraphQLJSON, { name: 'updateMePassword' })
  updateMePassword(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.authService.updateMePassword(
      toValidatedInput(UpdateMePasswordDto, input),
      user,
    );
  }

  @Query(() => GraphQLJSON, { name: 'adminPing' })
  @Roles(UserRole.TENANT_ADMIN)
  adminPing() {
    return { ok: true };
  }
}
