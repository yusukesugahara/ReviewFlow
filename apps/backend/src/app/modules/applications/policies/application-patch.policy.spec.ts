import { ClientErrorCodes } from '../../../../common/errors';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import { ApplicationPatchPolicy } from './application-patch.policy';

const app = (status: ApplicationStatusValue): Application =>
  ({ id: 'app-1', status }) as Application;

const expectErrorCode = (act: () => void, errorCode: string): void => {
  expect.assertions(1);
  try {
    act();
  } catch (error: unknown) {
    expect(error).toMatchObject({ errorCode });
  }
};

describe('ApplicationPatchPolicy', () => {
  let policy: ApplicationPatchPolicy;

  beforeEach(() => {
    policy = new ApplicationPatchPolicy();
  });

  it('rejects metadata changes while application is returned', () => {
    expectErrorCode(
      () =>
        policy.assertPatchTargetEditable(app(ApplicationStatus.RETURNED), {
          formDefinitionId: 'form-2',
        }),
      ClientErrorCodes.APPLICATION_NOT_EDITABLE,
    );
  });

  it('rejects status changes outside draft or published states', () => {
    expectErrorCode(
      () =>
        policy.assertPatchTargetEditable(app(ApplicationStatus.IN_REVIEW), {
          status: ApplicationStatus.PUBLISHED,
        }),
      ClientErrorCodes.APPLICATION_NOT_EDITABLE,
    );
  });

  it('allows returned applications to patch only correction-scoped fields', () => {
    expect(
      policy.requiresCorrectionFieldScope(app(ApplicationStatus.RETURNED)),
    ).toBe(true);
  });

  it('rejects field patches outside editable statuses', () => {
    expectErrorCode(
      () =>
        policy.assertFieldPatchAllowedWithoutCorrectionScope(
          app(ApplicationStatus.APPROVED),
        ),
      ClientErrorCodes.APPLICATION_NOT_EDITABLE,
    );
  });
});
