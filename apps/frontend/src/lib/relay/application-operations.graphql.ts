import { graphql } from "relay-runtime";

export const ApplicationSummaryFieldsFragment = graphql`
  fragment ApplicationSummaryFields on ApplicationSummary {
    relayId: id
    databaseId
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

export const ApplicationCapabilitiesFieldsFragment = graphql`
  fragment ApplicationCapabilitiesFields on ApplicationCapabilities {
    canEditApplication
    canSubmitApplication
    canResubmitApplication
    canApproveApplication
    canRejectApplication
    canReturnApplication
  }
`;

export const ApplicationProgressUserFieldsFragment = graphql`
  fragment ApplicationProgressUserFields on ApplicationProgressUser {
    id
    email
    name
  }
`;

export const ApplicationProgressActionFieldsFragment = graphql`
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

export const ApplicationProgressStepFieldsFragment = graphql`
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

export const ApplicationDetailFieldsFragment = graphql`
  fragment ApplicationDetailFields on ApplicationDetail {
    relayId: id
    databaseId
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

export const ApplicationCorrectionFieldsFragment = graphql`
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

export const ApplicationCorrectionTargetsFieldsFragment = graphql`
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

export const ApplicationsQuery = graphql`
  query ApplicationsQuery($groupId: ID!, $first: Int = 100, $after: String) {
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

export const ApplicationDetailQuery = graphql`
  query ApplicationDetailQuery($id: ID!) {
    application(id: $id) {
      ...ApplicationDetailFields
    }
  }
`;

export const ApplicationCorrectionsQuery = graphql`
  query ApplicationCorrectionsQuery($id: ID!) {
    applicationCorrections(id: $id) {
      ...ApplicationCorrectionFields
    }
  }
`;

export const ApplicationCorrectionTargetsQuery = graphql`
  query ApplicationCorrectionTargetsQuery($id: ID!) {
    applicationCorrectionTargets(id: $id) {
      ...ApplicationCorrectionTargetsFields
    }
  }
`;
