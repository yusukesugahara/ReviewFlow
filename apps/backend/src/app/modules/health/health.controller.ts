import { applyDecorators, Controller, Get, SetMetadata } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { SKIP_INTERNAL_API_KEY, SKIP_JWT_KEY } from '../../../common/constants';

/** API Key・JWT・レート制限の対象外。 */
function UnauthenticatedHealth() {
  return applyDecorators(
    SetMetadata(SKIP_INTERNAL_API_KEY, true),
    SetMetadata(SKIP_JWT_KEY, true),
    SkipThrottle({ default: true }),
  );
}

@ApiExcludeController()
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /** LB の liveness / K8s `livenessProbe` 向け。DB に触れない。 */
  @Get('health')
  @UnauthenticatedHealth()
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** DB 接続まで含む readiness / K8s `readinessProbe` 向け。 */
  @Get('ready')
  @UnauthenticatedHealth()
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
