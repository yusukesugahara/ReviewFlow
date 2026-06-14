import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { ApplicationFieldValue } from '../../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormField } from '../../../../../models/entities/form-field.entity';
import { ExportJobCsvBuilder } from './export-job-csv.builder';

describe('ExportJobCsvBuilder', () => {
  let builder: ExportJobCsvBuilder;

  beforeEach(() => {
    builder = new ExportJobCsvBuilder();
  });

  it('builds a CSV with base columns and sorted dynamic field columns', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');

    const csv = builder.build([
      application({
        id: 'app-1',
        status: ApplicationStatus.APPROVED,
        submittedAt: date,
        createdAt: date,
        updatedAt: date,
        applicantEmail: 'applicant@example.com',
        formDefinition: formDefinition({
          name: 'Expense "Form"',
          fields: [formField('note'), formField('amount')],
        }),
        fieldValues: [
          fieldValue('note', 'hello, "world"'),
          fieldValue('amount', 123),
        ],
      }),
    ]);

    expect(csv).toBe(
      [
        'applicationId,status,submittedAt,createdAt,updatedAt,applicantEmail,formDefinitionName,approvalFlowId,currentStepOrder,amount,note',
        'app-1,approved,2026-01-02T03:04:05.000Z,2026-01-02T03:04:05.000Z,2026-01-02T03:04:05.000Z,applicant@example.com,"Expense ""Form""",flow-1,,123,"hello, ""world"""',
        '',
      ].join('\n'),
    );
  });

  it('serializes object values as escaped JSON', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');

    const csv = builder.build([
      application({
        createdAt: date,
        updatedAt: date,
        formDefinition: formDefinition({
          name: 'Form',
          fields: [formField('payload')],
        }),
        fieldValues: [fieldValue('payload', { amount: 1000, currency: 'JPY' })],
      }),
    ]);

    expect(csv).toContain('"{""amount"":1000,""currency"":""JPY""}"');
  });

  it('outputs only base columns when there are no rows', () => {
    expect(builder.build([])).toBe(
      'applicationId,status,submittedAt,createdAt,updatedAt,applicantEmail,formDefinitionName,approvalFlowId,currentStepOrder\n',
    );
  });
});

function application(overrides: Partial<Application> = {}): Application {
  const date = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'form-1',
    approvalFlowId: 'flow-1',
    currentStepOrder: null,
    status: ApplicationStatus.SUBMITTED,
    submittedAt: null,
    createdAt: date,
    updatedAt: date,
    formDefinition: formDefinition({
      name: 'Form',
      fields: [],
    }),
    fieldValues: [],
    ...overrides,
  } as Application;
}

function formDefinition(
  params: Pick<FormDefinition, 'name' | 'fields'>,
): FormDefinition {
  return params as FormDefinition;
}

function formField(fieldKey: string): FormField {
  return { fieldKey } as FormField;
}

function fieldValue(
  fieldKey: string,
  valueJson: unknown,
): ApplicationFieldValue {
  return {
    formField: formField(fieldKey),
    valueJson,
  } as ApplicationFieldValue;
}
