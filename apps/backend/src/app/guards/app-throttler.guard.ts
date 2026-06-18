import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getRequestResponseFromExecutionContext } from '../../common/context/request-from-execution-context';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    return getRequestResponseFromExecutionContext(context);
  }
}
