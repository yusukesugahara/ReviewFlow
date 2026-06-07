import { ApplicationStatus } from '../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../models/constants/correction-request-status';
import { FormFieldType } from '../../../models/constants/form-field-type';
import type { Application } from '../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import { ApplicationCorrectionService } from './application-correction.service';

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    formDefinitionId: 'template-1',
    status: ApplicationStatus.RETURNED,
    fieldValues: [{ formFieldId: 'field-title', valueJson: 'Current' }],
    ...overrides,
  }) as Application;

const correction = (
  overrides: Partial<CorrectionRequest> = {},
): CorrectionRequest =>
  ({
    id: 'correction-1',
    tenantId: 'tenant-1',
    applicationId: 'app-1',
    status: CorrectionRequestStatus.OPEN,
    overallComment: 'Fix fields',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    resolvedAt: null,
    items: [
      {
        id: 'item-1',
        formFieldId: 'field-title',
        comment: 'Fix title',
        isResolved: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        formField: {
          id: 'field-title',
          fieldKey: 'title',
          label: 'Title',
          fieldType: FormFieldType.TEXT,
          required: true,
        },
      },
    ],
    ...overrides,
  }) as CorrectionRequest;

/**
 * ApplicationCorrectionService のテスト
 *
 * @group application-correction-service
 */
describe('ApplicationCorrectionService', () => {
  let correctionRequestsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let templatesRepo: { findOne: jest.Mock };
  let service: ApplicationCorrectionService;

  beforeEach(() => {
    correctionRequestsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    templatesRepo = { findOne: jest.fn() };
    service = new ApplicationCorrectionService(
      correctionRequestsRepo as never,
      templatesRepo as never,
    );
  });

  /**
   * open correction と現在値を修正対象レスポンスに変換すること
   */
  it('builds correction target response with current values', async () => {
    correctionRequestsRepo.find.mockResolvedValue([correction()]);

    const out = await service.buildTargetsResponse(app());

    expect(out.openCorrection).toMatchObject({
      id: 'correction-1',
      overallComment: 'Fix fields',
      items: [
        expect.objectContaining({
          fieldKey: 'title',
          currentValue: 'Current',
        }),
      ],
    });
  });

  /**
   * open correction が無い場合は null を返すこと
   */
  it('returns null target when there is no open correction', async () => {
    correctionRequestsRepo.find.mockResolvedValue([]);

    await expect(service.buildTargetsResponse(app())).resolves.toMatchObject({
      applicationId: 'app-1',
      openCorrection: null,
    });
  });

  /**
   * 差し戻しメール再送用 context を組み立てること
   */
  it('builds return email context', async () => {
    correctionRequestsRepo.findOne.mockResolvedValue(correction());
    templatesRepo.findOne.mockResolvedValue({
      id: 'template-1',
      name: 'Expense',
      fields: [],
    });

    const context = await service.getReturnEmailContext(app());

    expect(context.template.id).toBe('template-1');
    expect(context.dto).toEqual({
      overallComment: 'Fix fields',
      fields: [{ fieldId: 'field-title', comment: 'Fix title' }],
    });
  });
});
