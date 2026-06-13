import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogsRepository } from './audit-logs.repository';

type AuditLogQueryBuilderMock = {
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  andWhere: jest.Mock;
  getMany: jest.Mock;
};

function createQueryBuilderMock(): AuditLogQueryBuilderMock {
  const builder: AuditLogQueryBuilderMock = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
  };

  builder.leftJoinAndSelect.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.take.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.getMany.mockResolvedValue([]);

  return builder;
}

describe('AuditLogsRepository', () => {
  let repository: AuditLogsRepository;
  let auditLogs: jest.Mocked<
    Pick<Repository<AuditLog>, 'create' | 'save' | 'createQueryBuilder'>
  >;
  let builder: AuditLogQueryBuilderMock;

  beforeEach(async () => {
    builder = createQueryBuilderMock();
    auditLogs = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsRepository,
        { provide: getRepositoryToken(AuditLog), useValue: auditLogs },
      ],
    }).compile();

    repository = module.get(AuditLogsRepository);
  });

  it('creates audit log rows through TypeORM repository', async () => {
    const row = { id: 'audit-1' } as AuditLog;
    auditLogs.create.mockReturnValue(row);
    auditLogs.save.mockResolvedValue(row);

    await repository.create({
      tenantId: 'tenant-1',
      groupId: undefined,
      actorUserId: 'user-1',
      actorType: 'user',
      actorEmailSnapshot: 'actor@example.com',
      actionType: 'user.created',
      targetType: 'user',
      targetId: 'user-2',
      targetUserId: 'user-2',
      targetEmailSnapshot: 'target@example.com',
      summary: 'created user',
      metadataJson: { source: 'test' },
    });

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        groupId: null,
        actorUserId: 'user-1',
        actorType: 'user',
        actorEmailSnapshot: 'actor@example.com',
        actionType: 'user.created',
        targetType: 'user',
        targetId: 'user-2',
        targetUserId: 'user-2',
        targetEmailSnapshot: 'target@example.com',
        summary: 'created user',
        metadataJson: { source: 'test' },
      }),
    );
    expect(auditLogs.save).toHaveBeenCalledWith(row);
  });

  it('lists tenant audit logs with escaped filters', async () => {
    await repository.listByTenant('tenant-1', {
      limit: 20,
      actionType: 'user_%',
      q: 'email_%',
      createdFrom: '2026-01-01T00:00:00.000Z',
      createdTo: '2026-01-31T00:00:00.000Z',
    });

    expect(auditLogs.createQueryBuilder).toHaveBeenCalledWith('auditLog');
    expect(builder.where).toHaveBeenCalledWith(
      'auditLog.tenantId = :tenantId',
      { tenantId: 'tenant-1' },
    );
    expect(builder.orderBy).toHaveBeenCalledWith('auditLog.createdAt', 'DESC');
    expect(builder.take).toHaveBeenCalledWith(20);
    expect(builder.andWhere).toHaveBeenCalledWith(
      'auditLog.actionType LIKE :actionType',
      { actionType: 'user\\_\\%%' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('auditLog.targetType LIKE :q'),
      { q: '%email\\_\\%%' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'auditLog.createdAt >= :createdFrom',
      { createdFrom: new Date('2026-01-01T00:00:00.000Z') },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'auditLog.createdAt <= :createdTo',
      { createdTo: new Date('2026-01-31T00:00:00.000Z') },
    );
  });
});
