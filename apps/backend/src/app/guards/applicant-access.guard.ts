import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../common/errors';
import {
  AuthService,
  type ApplicantAccessTokenPayload,
} from '../modules/auth/auth.service';

type RequestWithApplicantSession = {
  applicantSession?: ApplicantAccessTokenPayload;
  headers: { [key: string]: string | string[] | undefined };
};

/**
 * Applicant Access Guard
 *
 * 申請者がアクセスできるかどうかを判断する。
 *
 * @param context ExecutionContext
 * @returns boolean
 */
@Injectable()
export class ApplicantAccessGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithApplicantSession>();
    const rawToken = request.headers['x-applicant-access-token'];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    request.applicantSession =
      this.authService.verifyApplicantAccessToken(token);
    return true;
  }
}
