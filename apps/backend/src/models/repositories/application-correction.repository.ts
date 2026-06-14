import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { CorrectionRequest } from '../entities/correction-request.entity';

@Injectable()
export class ApplicationCorrectionRepository {
  constructor(
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
  ) {}

  findOpenCorrection(
    params: { tenantId: string; applicationId: string },
    manager?: EntityManager,
  ): Promise<CorrectionRequest | null> {
    const repository =
      manager?.getRepository(CorrectionRequest) ?? this.correctionRequests;
    return repository.findOne({
      where: {
        tenantId: params.tenantId,
        applicationId: params.applicationId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
  }

  listCorrections(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest[]> {
    return this.correctionRequests.find({
      where: { applicationId, tenantId },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
  }

  findLatestOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: {
        applicationId,
        tenantId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
  }
}
