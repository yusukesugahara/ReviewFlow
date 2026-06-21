/**
 * @generated SignedSource<<caeb42bf2a063835f8d85b69212afd8e>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type SpaceSubmissionsApplicationsListPaginationQuery$variables = {
  after?: string | null | undefined;
  first?: number | null | undefined;
  groupId: string;
};
export type SpaceSubmissionsApplicationsListPaginationQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"SpaceSubmissionsApplicationsList_query">;
};
export type SpaceSubmissionsApplicationsListPaginationQuery = {
  response: SpaceSubmissionsApplicationsListPaginationQuery$data;
  variables: SpaceSubmissionsApplicationsListPaginationQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "after"
  },
  {
    "defaultValue": 100,
    "kind": "LocalArgument",
    "name": "first"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "groupId"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "after"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "first"
  },
  {
    "kind": "Variable",
    "name": "groupId",
    "variableName": "groupId"
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "SpaceSubmissionsApplicationsListPaginationQuery",
    "selections": [
      {
        "args": (v1/*:: as any*/),
        "kind": "FragmentSpread",
        "name": "SpaceSubmissionsApplicationsList_query"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "SpaceSubmissionsApplicationsListPaginationQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationSummaryConnection",
        "kind": "LinkedField",
        "name": "applicationsConnection",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "ApplicationSummaryEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "cursor",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "ApplicationSummary",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  {
                    "alias": "relayId",
                    "args": null,
                    "kind": "ScalarField",
                    "name": "id",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "databaseId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "groupId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "status",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "formDefinitionId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "formDefinitionName",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "applicationName",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "applicantEmail",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "applicantUserId",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "currentStepAssigneeUserIds",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "createdAt",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "updatedAt",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "id",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "__typename",
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "PageInfo",
            "kind": "LinkedField",
            "name": "pageInfo",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "endCursor",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "hasNextPage",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalCount",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "filters": [
          "groupId"
        ],
        "handle": "connection",
        "key": "SpaceSubmissionsApplicationsList_applicationsConnection",
        "kind": "LinkedHandle",
        "name": "applicationsConnection"
      }
    ]
  },
  "params": {
    "cacheID": "31640dce6d173ef8e15a1c42423f15b6",
    "id": null,
    "metadata": {},
    "name": "SpaceSubmissionsApplicationsListPaginationQuery",
    "operationKind": "query",
    "text": "query SpaceSubmissionsApplicationsListPaginationQuery(\n  $after: String\n  $first: Int = 100\n  $groupId: ID!\n) {\n  ...SpaceSubmissionsApplicationsList_query_4j06B2\n}\n\nfragment SpaceSubmissionsApplicationRows_applications on ApplicationSummary {\n  relayId: id\n  databaseId\n  groupId\n  status\n  formDefinitionId\n  formDefinitionName\n  applicationName\n  applicantEmail\n  applicantUserId\n  currentStepAssigneeUserIds\n  createdAt\n  updatedAt\n}\n\nfragment SpaceSubmissionsApplicationsList_query_4j06B2 on Query {\n  applicationsConnection(groupId: $groupId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        ...SpaceSubmissionsApplicationRows_applications\n        id\n        __typename\n      }\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    totalCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "c3e1ba3eb1fb74ce2453b1078bec6d53";

export default node;
