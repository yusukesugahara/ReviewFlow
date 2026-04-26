import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type ApplicantAccessTokenPayload,
} from '../modules/auth/auth.service';
import { ClientErrorCodes, clientError } from '../../common/errors';

type ApplicantRequest = Request & {
  applicantSession?: ApplicantAccessTokenPayload;
};

@Injectable()
export class ApplicantAccessGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ApplicantRequest>();
    const header = request.headers['x-applicant-access-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    request.applicantSession =
      this.authService.verifyApplicantAccessToken(token);
    return true;
  }
}
