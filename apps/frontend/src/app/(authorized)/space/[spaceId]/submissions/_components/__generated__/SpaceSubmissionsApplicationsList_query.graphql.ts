/**
 * @generated SignedSource<<78e3ed98f87cfe51bcaaabf63646525f>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type SpaceSubmissionsApplicationsList_query$data = {
  readonly applicationsConnection: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly " $fragmentSpreads": FragmentRefs<"SpaceSubmissionsApplicationRows_applications">;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
    readonly totalCount: number;
  };
  readonly " $fragmentType": "SpaceSubmissionsApplicationsList_query";
};
export type SpaceSubmissionsApplicationsList_query$key = {
  readonly " $data"?: SpaceSubmissionsApplicationsList_query$data;
  readonly " $fragmentSpreads": FragmentRefs<"SpaceSubmissionsApplicationsList_query">;
};

import SpaceSubmissionsApplicationsListPaginationQuery_graphql from './SpaceSubmissionsApplicationsListPaginationQuery.graphql';

const node: ReaderFragment = (function(){
var v0 = [
  "applicationsConnection"
];
return {
  "argumentDefinitions": [
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
  "kind": "Fragment",
  "metadata": {
    "connection": [
      {
        "count": "first",
        "cursor": "after",
        "direction": "forward",
        "path": (v0/*:: as any*/)
      }
    ],
    "refetch": {
      "connection": {
        "forward": {
          "count": "first",
          "cursor": "after"
        },
        "backward": null,
        "path": (v0/*:: as any*/)
      },
      "fragmentPathInResult": [],
      "operation": SpaceSubmissionsApplicationsListPaginationQuery_graphql
    }
  },
  "name": "SpaceSubmissionsApplicationsList_query",
  "selections": [
    {
      "alias": "applicationsConnection",
      "args": [
        {
          "kind": "Variable",
          "name": "groupId",
          "variableName": "groupId"
        }
      ],
      "concreteType": "ApplicationSummaryConnection",
      "kind": "LinkedField",
      "name": "__SpaceSubmissionsApplicationsList_applicationsConnection_connection",
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
                  "args": null,
                  "kind": "FragmentSpread",
                  "name": "SpaceSubmissionsApplicationRows_applications"
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
    }
  ],
  "type": "Query",
  "abstractKey": null
};
})();

(node as any).hash = "c3e1ba3eb1fb74ce2453b1078bec6d53";

export default node;
