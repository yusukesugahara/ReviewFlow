/**
 * @generated SignedSource<<e9af928a32dd364ec71904db1c1b6e44>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type ApplicationCorrectionTargetsFields$data = {
  readonly applicationId: string;
  readonly applicationStatus: string;
  readonly openCorrection: {
    readonly createdAt: string;
    readonly id: string;
    readonly items: ReadonlyArray<{
      readonly comment: string | null | undefined;
      readonly currentValue: unknown | null | undefined;
      readonly fieldKey: string;
      readonly fieldType: string;
      readonly formFieldId: string;
      readonly itemId: string;
      readonly label: string;
      readonly required: boolean;
    }>;
    readonly overallComment: string | null | undefined;
  } | null | undefined;
  readonly " $fragmentType": "ApplicationCorrectionTargetsFields";
};
export type ApplicationCorrectionTargetsFields$key = {
  readonly " $data"?: ApplicationCorrectionTargetsFields$data;
  readonly " $fragmentSpreads": FragmentRefs<"ApplicationCorrectionTargetsFields">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ApplicationCorrectionTargetsFields",
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
  "type": "ApplicationCorrectionTargets",
  "abstractKey": null
};

(node as any).hash = "3fc9f46590f403a22c5bd78caf7ebe32";

export default node;
