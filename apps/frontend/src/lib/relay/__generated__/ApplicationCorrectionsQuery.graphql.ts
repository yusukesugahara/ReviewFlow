/**
 * @generated SignedSource<<1511455d6cfda1a3def5c24a320c92e9>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationCorrectionsQuery$variables = {
  id: string;
};
export type ApplicationCorrectionsQuery$data = {
  readonly applicationCorrections: ReadonlyArray<{
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationCorrectionFields">;
  }>;
};
export type ApplicationCorrectionsQuery = {
  response: ApplicationCorrectionsQuery$data;
  variables: ApplicationCorrectionsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "id"
  }
],
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ApplicationCorrectionsQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationCorrection",
        "kind": "LinkedField",
        "name": "applicationCorrections",
        "plural": true,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "ApplicationCorrectionFields"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "ApplicationCorrectionsQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationCorrection",
        "kind": "LinkedField",
        "name": "applicationCorrections",
        "plural": true,
        "selections": [
          (v2/*:: as any*/),
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
            "name": "overallComment",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "resolvedAt",
            "storageKey": null
          },
          (v3/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "ApplicationCorrectionItem",
            "kind": "LinkedField",
            "name": "items",
            "plural": true,
            "selections": [
              (v2/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "formFieldId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "fieldKey",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "comment",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "isResolved",
                "storageKey": null
              },
              (v3/*:: as any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "072a10537564bccee6e196099cdbb1f6",
    "id": null,
    "metadata": {},
    "name": "ApplicationCorrectionsQuery",
    "operationKind": "query",
    "text": "query ApplicationCorrectionsQuery(\n  $id: ID!\n) {\n  applicationCorrections(id: $id) {\n    ...ApplicationCorrectionFields\n    id\n  }\n}\n\nfragment ApplicationCorrectionFields on ApplicationCorrection {\n  id\n  status\n  overallComment\n  resolvedAt\n  createdAt\n  items {\n    id\n    formFieldId\n    fieldKey\n    comment\n    isResolved\n    createdAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "9339c2303fdde14aba3bc01a1a4ad7ab";

export default node;
