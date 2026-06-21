/**
 * @generated SignedSource<<e3df8d816dbc6d0b086c88120f12d29d>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ConcreteRequest } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationDetailQuery$variables = {
  id: string;
};
export type ApplicationDetailQuery$data = {
  readonly application: {
    readonly " $fragmentSpreads": FragmentRefs<"ApplicationDetailFields">;
  };
};
export type ApplicationDetailQuery = {
  response: ApplicationDetailQuery$data;
  variables: ApplicationDetailQuery$variables;
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
  "name": "status",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v4 = [
  (v3/*:: as any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "email",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "name",
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ApplicationDetailQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationDetail",
        "kind": "LinkedField",
        "name": "application",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "ApplicationDetailFields"
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
    "name": "ApplicationDetailQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ApplicationDetail",
        "kind": "LinkedField",
        "name": "application",
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
          (v2/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "approvalFlowId",
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
            "name": "currentStepOrder",
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
            "name": "submittedAt",
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
            "name": "currentStepCanReturn",
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
            "concreteType": "ApplicationCapabilities",
            "kind": "LinkedField",
            "name": "capabilities",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canEditApplication",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canSubmitApplication",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canResubmitApplication",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canApproveApplication",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canRejectApplication",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canReturnApplication",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "ApplicationProgressStep",
            "kind": "LinkedField",
            "name": "approvalProgress",
            "plural": true,
            "selections": [
              (v3/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "stepOrder",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "stepName",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "canReturn",
                "storageKey": null
              },
              (v2/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "ApplicationProgressUser",
                "kind": "LinkedField",
                "name": "assignees",
                "plural": true,
                "selections": (v4/*:: as any*/),
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "ApplicationProgressAction",
                "kind": "LinkedField",
                "name": "actions",
                "plural": true,
                "selections": [
                  (v3/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "action",
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
                    "name": "actedAt",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "ApplicationProgressUser",
                    "kind": "LinkedField",
                    "name": "actedBy",
                    "plural": false,
                    "selections": (v4/*:: as any*/),
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          (v3/*:: as any*/)
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "5d32b236abd5727ce9c46155214b213a",
    "id": null,
    "metadata": {},
    "name": "ApplicationDetailQuery",
    "operationKind": "query",
    "text": "query ApplicationDetailQuery(\n  $id: ID!\n) {\n  application(id: $id) {\n    ...ApplicationDetailFields\n    id\n  }\n}\n\nfragment ApplicationCapabilitiesFields on ApplicationCapabilities {\n  canEditApplication\n  canSubmitApplication\n  canResubmitApplication\n  canApproveApplication\n  canRejectApplication\n  canReturnApplication\n}\n\nfragment ApplicationDetailFields on ApplicationDetail {\n  relayId: id\n  databaseId\n  groupId\n  status\n  approvalFlowId\n  formDefinitionId\n  formDefinitionName\n  applicationName\n  applicantEmail\n  applicantUserId\n  currentStepOrder\n  currentStepAssigneeUserIds\n  submittedAt\n  createdAt\n  updatedAt\n  currentStepCanReturn\n  values\n  capabilities {\n    ...ApplicationCapabilitiesFields\n  }\n  approvalProgress {\n    ...ApplicationProgressStepFields\n    id\n  }\n}\n\nfragment ApplicationProgressActionFields on ApplicationProgressAction {\n  id\n  action\n  comment\n  actedAt\n  actedBy {\n    ...ApplicationProgressUserFields\n    id\n  }\n}\n\nfragment ApplicationProgressStepFields on ApplicationProgressStep {\n  id\n  stepOrder\n  stepName\n  canReturn\n  status\n  assignees {\n    ...ApplicationProgressUserFields\n    id\n  }\n  actions {\n    ...ApplicationProgressActionFields\n    id\n  }\n}\n\nfragment ApplicationProgressUserFields on ApplicationProgressUser {\n  id\n  email\n  name\n}\n"
  }
};
})();

(node as any).hash = "a2a7a749713f296ae956d4f114eae12e";

export default node;
