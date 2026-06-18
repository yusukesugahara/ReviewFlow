import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getRequestFromExecutionContext } from '../common/context/request-from-execution-context';
import type { ApplicantAccessTokenPayload } from '../app/modules/auth/services/facades/auth.service';

/**
 * 申請者アクセス token から復元した申請者セッションを controller 引数へ注入する。
 *
 * `ApplicantAccessGuard` が `request.applicantSession` に載せた値を返すため、
 * 申請者向け public route で guard と併用する。
 */
export const CurrentApplicantSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApplicantAccessTokenPayload => {
    const request = getRequestFromExecutionContext(ctx) as {
      applicantSession?: ApplicantAccessTokenPayload;
    };
    return request.applicantSession as ApplicantAccessTokenPayload;
  },
);
