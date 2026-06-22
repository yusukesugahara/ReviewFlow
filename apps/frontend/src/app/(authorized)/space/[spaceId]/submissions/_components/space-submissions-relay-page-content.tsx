"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { graphql, useFragment, useLazyLoadQuery, usePaginationFragment } from "react-relay";
import { Button } from "@/components/ui/button";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import { BrowserRelayProvider } from "@/lib/relay/browser-provider";
import { SpaceSubmissionsPageContent } from "./space-submissions-page-content";
import type { SubmissionFilters } from "../_utils/space-submissions.helpers";
import type { SpaceSubmissionsPageQuery } from "./__generated__/SpaceSubmissionsPageQuery.graphql";
import type { SpaceSubmissionsApplicationsListPaginationQuery } from "./__generated__/SpaceSubmissionsApplicationsListPaginationQuery.graphql";
import type { SpaceSubmissionsApplicationsList_query$key } from "./__generated__/SpaceSubmissionsApplicationsList_query.graphql";
import type { SpaceSubmissionsApplicationRows_applications$key } from "./__generated__/SpaceSubmissionsApplicationRows_applications.graphql";
import type { ExportJobResponse } from "@/lib/schema";

const SpaceSubmissionsPageQueryNode = graphql`
  query SpaceSubmissionsPageQuery($groupId: ID!, $first: Int = 100, $after: String) {
    ...SpaceSubmissionsApplicationsList_query
      @arguments(groupId: $groupId, first: $first, after: $after)
  }
`;

const SpaceSubmissionsApplicationsListFragment = graphql`
  fragment SpaceSubmissionsApplicationsList_query on Query
  @argumentDefinitions(
    groupId: { type: "ID!" }
    first: { type: "Int", defaultValue: 100 }
    after: { type: "String" }
  )
  @refetchable(queryName: "SpaceSubmissionsApplicationsListPaginationQuery") {
    applicationsConnection(groupId: $groupId, first: $first, after: $after)
      @connection(key: "SpaceSubmissionsApplicationsList_applicationsConnection") {
      edges {
        cursor
        node {
          ...SpaceSubmissionsApplicationRows_applications
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`;

const SpaceSubmissionsApplicationRowsFragment = graphql`
  fragment SpaceSubmissionsApplicationRows_applications on ApplicationSummary
  @relay(plural: true) {
    relayId: id
    databaseId
    groupId
    status
    formDefinitionId
    formDefinitionName
    applicationName
    applicantEmail
    applicantUserId
    currentStepAssigneeUserIds
    createdAt
    updatedAt
  }
`;

type SpaceSubmissionsRelayPageContentProps = {
  currentUserId: string | null;
  fetchErrorStatus?: number;
  filters: SubmissionFilters;
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

/**
 * 提出一覧画面の GraphQL データを React Relay hooks で取得します。
 */
export function SpaceSubmissionsRelayPageContent(
  props: SpaceSubmissionsRelayPageContentProps,
) {
  if (props.fetchErrorStatus !== undefined) {
    return <SpaceSubmissionsPageContent applications={[]} {...props} />;
  }

  return (
    <BrowserRelayProvider>
      <SpaceSubmissionsRelayErrorBoundary
        fallback={(status) => (
          <SpaceSubmissionsPageContent
            applications={[]}
            {...props}
            fetchErrorStatus={status}
          />
        )}
        resetKey={spaceSubmissionsRelayResetKey(props)}
      >
        <Suspense fallback={<SpaceSubmissionsLoadingState />}>
          <SpaceSubmissionsRelayContent {...props} />
        </Suspense>
      </SpaceSubmissionsRelayErrorBoundary>
    </BrowserRelayProvider>
  );
}

function SpaceSubmissionsRelayContent({
  currentUserId,
  filters,
  latestExportJob,
  spaceId,
}: SpaceSubmissionsRelayPageContentProps) {
  const queryRef = useLazyLoadQuery<SpaceSubmissionsPageQuery>(
    SpaceSubmissionsPageQueryNode,
    { groupId: spaceId, first: 100 },
    { fetchPolicy: "store-and-network" },
  );

  return (
    <SpaceSubmissionsApplicationsList
      currentUserId={currentUserId}
      filters={filters}
      latestExportJob={latestExportJob}
      queryRef={queryRef}
      spaceId={spaceId}
    />
  );
}

function SpaceSubmissionsApplicationsList({
  currentUserId,
  filters,
  latestExportJob,
  queryRef,
  spaceId,
}: SpaceSubmissionsRelayPageContentProps & {
  queryRef: SpaceSubmissionsApplicationsList_query$key;
}) {
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    SpaceSubmissionsApplicationsListPaginationQuery,
    SpaceSubmissionsApplicationsList_query$key
  >(SpaceSubmissionsApplicationsListFragment, queryRef);
  const connection = data.applicationsConnection as
    | typeof data.applicationsConnection
    | null
    | undefined;
  const applicationRefs = (connection?.edges.map((edge) => edge.node) ??
    []) as SpaceSubmissionsApplicationRows_applications$key;
  const applications = useFragment<SpaceSubmissionsApplicationRows_applications$key>(
    SpaceSubmissionsApplicationRowsFragment,
    applicationRefs,
  ).map(toApplicationRow);

  if (!connection) {
    return (
      <SpaceSubmissionsPageContent
        applications={[]}
        currentUserId={currentUserId}
        fetchErrorStatus={500}
        filters={filters}
        latestExportJob={latestExportJob}
        spaceId={spaceId}
      />
    );
  }

  return (
    <SpaceSubmissionsPageContent
      applications={applications}
      currentUserId={currentUserId}
      filters={filters}
      latestExportJob={latestExportJob}
      paginationAction={
        hasNext ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoadingNext}
              onClick={() => loadNext(100)}
            >
              {isLoadingNext ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  読み込み中
                </>
              ) : (
                "さらに読み込む"
              )}
            </Button>
          </div>
        ) : null
      }
      spaceId={spaceId}
    />
  );
}

function SpaceSubmissionsLoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      読み込み中
    </div>
  );
}

function toApplicationRow(
  application: Readonly<{
    applicantEmail: string;
    applicantUserId?: string | null;
    applicationName: string;
    createdAt: string;
    currentStepAssigneeUserIds: ReadonlyArray<string>;
    databaseId: string;
    formDefinitionId: string;
    formDefinitionName: string;
    groupId: string;
    status: string;
    updatedAt: string;
  }>,
): ApplicationRow {
  return {
    applicantEmail: application.applicantEmail,
    applicantUserId: application.applicantUserId,
    applicationName: application.applicationName,
    createdAt: application.createdAt,
    currentStepAssigneeUserIds: [...application.currentStepAssigneeUserIds],
    formDefinitionId: application.formDefinitionId,
    formDefinitionName: application.formDefinitionName,
    groupId: application.groupId,
    id: application.databaseId,
    status: application.status,
    updatedAt: application.updatedAt,
  };
}

type SpaceSubmissionsRelayErrorBoundaryProps = {
  children: ReactNode;
  fallback: (status: number) => ReactNode;
  resetKey: string;
};

type SpaceSubmissionsRelayErrorBoundaryState = {
  error: unknown;
};

class SpaceSubmissionsRelayErrorBoundary extends Component<
  SpaceSubmissionsRelayErrorBoundaryProps,
  SpaceSubmissionsRelayErrorBoundaryState
> {
  state: SpaceSubmissionsRelayErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidUpdate(previousProps: SpaceSubmissionsRelayErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(statusFromRelayError(this.state.error));
    }

    return this.props.children;
  }
}

function statusFromRelayError(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return 500;
}

function spaceSubmissionsRelayResetKey({
  filters,
  spaceId,
}: SpaceSubmissionsRelayPageContentProps): string {
  return [
    spaceId,
    filters.applicant,
    filters.createdFrom,
    filters.createdTo,
    filters.form,
    filters.page,
    filters.status,
    filters.summary,
  ].join(":");
}
