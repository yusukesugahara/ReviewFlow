/**
 * @generated SignedSource<<653e431d886a546af9164fff7735bcad>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationCorrectionTargetsQuery$variables = {
  id: string;
};
export type ApplicationCorrectionTargetsQuery$data = {
  readonly applicationCorrectionTargets: {
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationCorrectionTargetsFields">;
  };
};
export type ApplicationCorrectionTargetsQuery = {
  response: ApplicationCorrectionTargetsQuery$data;
  variables: ApplicationCorrectionTargetsQuery$variables;
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ApplicationCorrectionTargetsQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationCorrectionTargets",
        "kind": "LinkedField",
        "name": "applicationCorrectionTargets",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "ApplicationCorrectionTargetsFields"
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
    "name": "ApplicationCorrectionTargetsQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationCorrectionTargets",
        "kind": "LinkedField",
        "name": "applicationCorrectionTargets",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "applicationId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "applicationStatus",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "values",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "ApplicationOpenCorrectionTargets",
            "kind": "LinkedField",
            "name": "openCorrection",
            "plural": false,
            "selections": [
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
                "name": "overallComment",
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
                "concreteType": "ApplicationCorrectionTargetItem",
                "kind": "LinkedField",
                "name": "items",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "itemId",
                    "storageKey": null
                  },
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
                    "name": "label",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "fieldType",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "required",
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
                    "name": "currentValue",
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "3cfcb85f7a8c8cdd211f7f022c3b97e5",
    "id": null,
    "metadata": {},
    "name": "ApplicationCorrectionTargetsQuery",
    "operationKind": "query",
    "text": "query ApplicationCorrectionTargetsQuery(\n  $id: ID!\n) {\n  applicationCorrectionTargets(id: $id) {\n    ...ApplicationCorrectionTargetsFields\n  }\n}\n\nfragment ApplicationCorrectionTargetsFields on ApplicationCorrectionTargets {\n  applicationId\n  applicationStatus\n  values\n  openCorrection {\n    id\n    overallComment\n    createdAt\n    items {\n      itemId\n      formFieldId\n      fieldKey\n      label\n      fieldType\n      required\n      comment\n      currentValue\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5c9a210bf76387868411b963be742c4a";

export default node;
