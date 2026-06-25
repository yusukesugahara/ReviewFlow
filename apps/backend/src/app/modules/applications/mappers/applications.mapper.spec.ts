import { ApplicationStatus } from '../../../../models/constants/application-status';
import { CorrectionRequestStatus } from '../../../../models/constants/correction-request-status';
import { FormFieldType } from '../../../../models/constants/form-field-type';
import type { Application } from '../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type { FormField } from '../../../../models/entities/form-field.entity';
import {
  mapCorrectionTargetsResponse,
  mapCorrectionToReturnApplicationDto,
} from './applications.mapper';

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    status: ApplicationStatus.RETURNED,
    fieldValues: [{ formFieldId: 'field-title', valueJson: 'Current' }],
    ...overrides,
  }) as Application;

const correction = (
  overrides: Partial<CorrectionRequest> = {},
): CorrectionRequest =>
  ({
    id: 'correction-1',
    status: CorrectionRequestStatus.OPEN,
    overallComment: 'Fix fields',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    resolvedAt: null,
    items: [
      {
        id: 'item-1',
        formFieldId: 'field-title',
        comment: 'Fix title',
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

describe('applications mapper correction helpers', () => {
  it('maps open correction targets with current application values', () => {
    const response = mapCorrectionTargetsResponse(app(), correction(), [
      { id: 'field-title', fieldKey: 'title' },
    ] as FormField[]);

    expect(response).toMatchObject({
      applicationId: 'app-1',
      applicationStatus: ApplicationStatus.RETURNED,
      values: { title: 'Current' },
      openCorrection: {
        id: 'correction-1',
        overallComment: 'Fix fields',
        createdAt: '2026-01-01T00:00:00.000Z',
        items: [
          expect.objectContaining({
            itemId: 'item-1',
            formFieldId: 'field-title',
            fieldKey: 'title',
            currentValue: 'Current',
          }),
        ],
      },
    });
  });

  it('maps missing open corrections to a null target', () => {
    const response = mapCorrectionTargetsResponse(app(), null, [
      { id: 'field-title', fieldKey: 'title' },
    ] as FormField[]);

    expect(response).toEqual({
      applicationId: 'app-1',
      applicationStatus: ApplicationStatus.RETURNED,
      values: { title: 'Current' },
      openCorrection: null,
    });
  });

  it('maps correction items to a return application dto', () => {
    const dto = mapCorrectionToReturnApplicationDto(correction());

    expect(dto).toEqual({
      overallComment: 'Fix fields',
      fields: [{ fieldId: 'field-title', comment: 'Fix title' }],
    });
  });
});
