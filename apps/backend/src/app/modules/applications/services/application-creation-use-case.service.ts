import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { Application } from '../../../../models/entities/application.entity';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CreateApplicationDto } from '../dto/applications.dto';
import { ApplicationCreationService } from './application-creation.service';

@Injectable()
export class ApplicationCreationUseCaseService {
  constructor(
    private readonly spaceAccess: SpaceAccessService,
    private readonly creationService: ApplicationCreationService,
  ) {}

  async create(
    actor: AuthUserPayload,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    await this.spaceAccess.assertCanUseGroup(actor, dto.groupId);
    return this.creationService.create(
      actor.tenantId,
      actor.email,
      actor.id,
      dto,
    );
  }
}
