import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../app/modules/auth/auth.service';

export const CurrentApplicantSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApplicantAccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<{
      applicantSession?: ApplicantAccessTokenPayload;
    }>();
    if (!request.applicantSession) {
      throw new Error('applicant session missing');
    }
    return request.applicantSession;
  },
);
