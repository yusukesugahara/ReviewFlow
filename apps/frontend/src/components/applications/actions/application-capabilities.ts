import type {
  ApplicationCapabilities,
  ApplicationDetailViewModel,
} from "../detail/application-detail.types";

export type { ApplicationCapabilities } from "../detail/application-detail.types";

const DISABLED_APPLICATION_CAPABILITIES: ApplicationCapabilities = {
  canEditApplication: false,
  canSubmitApplication: false,
  canResubmitApplication: false,
  canApproveApplication: false,
  canRejectApplication: false,
  canReturnApplication: false,
};

export function getApplicationCapabilities(
  application: ApplicationDetailViewModel,
): ApplicationCapabilities {
  return application.capabilities ?? DISABLED_APPLICATION_CAPABILITIES;
}
