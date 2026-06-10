import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { CorrectionRequest } from '../entities/correction-request.entity';

@Injectable()
export class ApplicationCorrectionRepository {
  constructor(
    @InjectRepository(CorrectionRequest)
    private readonly correctionRequests: Repository<CorrectionRequest>,
  ) {}

  findOpenCorrection(applicationId: string): Promise<CorrectionRequest | null> {
    return this.correctionRequests.findOne({
      where: { applicationId, status: CorrectionRequestStatus.OPEN },
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

  async findLatestOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    const opens = await this.correctionRequests.find({
      where: {
        applicationId,
        tenantId,
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
    return opens[0] ?? null;
  }
}
