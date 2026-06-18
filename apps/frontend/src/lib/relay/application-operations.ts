const APPLICATION_SUMMARY_FRAGMENT = `
  fragment ApplicationSummaryFields on ApplicationSummary {
    relayId: id
    id: databaseId
    groupId
    status
    approvalFlowId
    formDefinitionId
    formDefinitionName
    applicationName
    applicantEmail
    applicantUserId
    currentStepOrder
    currentStepAssigneeUserIds
    submittedAt
    createdAt
    updatedAt
  }
`;

const APPLICATION_CAPABILITIES_FRAGMENT = `
  fragment ApplicationCapabilitiesFields on ApplicationCapabilities {
    canEditApplication
    canSubmitApplication
    canResubmitApplication
    canApproveApplication
    canRejectApplication
    canReturnApplication
  }
`;

const APPLICATION_PROGRESS_USER_FRAGMENT = `
  fragment ApplicationProgressUserFields on ApplicationProgressUser {
    id
    email
    name
  }
`;

const APPLICATION_PROGRESS_ACTION_FRAGMENT = `
  fragment ApplicationProgressActionFields on ApplicationProgressAction {
    id
    action
    comment
    actedAt
    actedBy {
      ...ApplicationProgressUserFields
    }
  }
`;

const APPLICATION_PROGRESS_STEP_FRAGMENT = `
  fragment ApplicationProgressStepFields on ApplicationProgressStep {
    id
    stepOrder
    stepName
    canReturn
    status
    assignees {
      ...ApplicationProgressUserFields
    }
    actions {
      ...ApplicationProgressActionFields
    }
  }
`;

const APPLICATION_DETAIL_FRAGMENT = `
  fragment ApplicationDetailFields on ApplicationDetail {
    relayId: id
    id: databaseId
    groupId
    status
    approvalFlowId
    formDefinitionId
    formDefinitionName
    applicationName
    applicantEmail
    applicantUserId
    currentStepOrder
    currentStepAssigneeUserIds
    submittedAt
    createdAt
    updatedAt
    currentStepCanReturn
    values
    capabilities {
      ...ApplicationCapabilitiesFields
    }
    approvalProgress {
      ...ApplicationProgressStepFields
    }
  }
`;

const APPLICATION_CORRECTION_FRAGMENT = `
  fragment ApplicationCorrectionFields on ApplicationCorrection {
    id
    status
    overallComment
    resolvedAt
    createdAt
    items {
      id
      formFieldId
      fieldKey
      comment
      isResolved
      createdAt
    }
  }
`;

const APPLICATION_CORRECTION_TARGETS_FRAGMENT = `
  fragment ApplicationCorrectionTargetsFields on ApplicationCorrectionTargets {
    applicationId
    applicationStatus
    openCorrection {
      id
      overallComment
      createdAt
      items {
        itemId
        formFieldId
        fieldKey
        label
        fieldType
        required
        comment
        currentValue
      }
    }
  }
`;

export const APPLICATIONS_QUERY = `
  ${APPLICATION_SUMMARY_FRAGMENT}

  query Applications($groupId: ID!, $first: Int = 100, $after: String) {
    applicationsConnection(groupId: $groupId, first: $first, after: $after) {
      nodes {
        ...ApplicationSummaryFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const APPLICATION_DETAIL_QUERY = `
  ${APPLICATION_CAPABILITIES_FRAGMENT}
  ${APPLICATION_PROGRESS_USER_FRAGMENT}
  ${APPLICATION_PROGRESS_ACTION_FRAGMENT}
  ${APPLICATION_PROGRESS_STEP_FRAGMENT}
  ${APPLICATION_DETAIL_FRAGMENT}

  query ApplicationDetail($id: ID!) {
    application(id: $id) {
      ...ApplicationDetailFields
    }
  }
`;

export const APPLICATION_CORRECTIONS_QUERY = `
  ${APPLICATION_CORRECTION_FRAGMENT}

  query ApplicationCorrections($id: ID!) {
    applicationCorrections(id: $id) {
      ...ApplicationCorrectionFields
    }
  }
`;

export const APPLICATION_CORRECTION_TARGETS_QUERY = `
  ${APPLICATION_CORRECTION_TARGETS_FRAGMENT}

  query ApplicationCorrectionTargets($id: ID!) {
    applicationCorrectionTargets(id: $id) {
      ...ApplicationCorrectionTargetsFields
    }
  }
`;
