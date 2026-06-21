/**
 * @generated SignedSource<<a242183e8ce8d1dad805b687ec94d8e9>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationCorrectionFields$data = {
  readonly createdAt: string;
  readonly id: string;
  readonly items: ReadonlyArray<{
    readonly comment: string | null | undefined;
    readonly createdAt: string;
    readonly fieldKey: string;
    readonly formFieldId: string;
    readonly id: string;
    readonly isResolved: boolean;
  }>;
  readonly overallComment: string | null | undefined;
  readonly resolvedAt: string | null | undefined;
  readonly status: string;
  readonly " $fragmentType": "ApplicationCorrectionFields";
};
export type ApplicationCorrectionFields$key = {
  readonly " $data"?: ApplicationCorrectionFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationCorrectionFields">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationCorrectionFields",
  "selections": [
    (v0/*:: as any*/),
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
    (v1/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "ApplicationCorrectionItem",
      "kind": "LinkedField",
      "name": "items",
      "plural": true,
      "selections": [
        (v0/*:: as any*/),
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
        (v1/*:: as any*/)
      ],
      "storageKey": null
    }
  ],
  "type": "ApplicationCorrection",
  "abstractKey": null
};
})();

(node as any).hash = "971325a322ff14be776ef2db8239e107";

export default node;
