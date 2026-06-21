import type { ConcreteRequest } from "relay-runtime";
import ApplicationCorrectionTargetsQueryNode from "./__generated__/ApplicationCorrectionTargetsQuery.graphql";
import ApplicationCorrectionsQueryNode from "./__generated__/ApplicationCorrectionsQuery.graphql";
import ApplicationDetailQueryNode from "./__generated__/ApplicationDetailQuery.graphql";
import ApplicationsQueryNode from "./__generated__/ApplicationsQuery.graphql";

export const APPLICATIONS_QUERY = graphqlText(ApplicationsQueryNode);
export const APPLICATION_DETAIL_QUERY = graphqlText(ApplicationDetailQueryNode);
export const APPLICATION_CORRECTIONS_QUERY = graphqlText(
  ApplicationCorrectionsQueryNode,
);
export const APPLICATION_CORRECTION_TARGETS_QUERY = graphqlText(
  ApplicationCorrectionTargetsQueryNode,
);

function graphqlText(request: ConcreteRequest): string {
  if (!request.params.text) {
    throw new Error(`Relay operation ${request.params.name} has no query text.`);
  }
  return request.params.text;
}
