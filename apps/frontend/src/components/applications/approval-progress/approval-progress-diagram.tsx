"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import {
  isSelectableProgressStep,
} from "./approval-progress.helpers";
import { SelectedProgressStepApplication } from "./approval-progress-step-detail";
import {
  ApprovalProgressStartCard,
  ApprovalProgressStepCard,
} from "./approval-progress-step-cards";
import type {
  ApplicationCorrection,
  ApplicationDetailViewModel,
  ApplicationFormField,
  ApplicationProgressStep,
} from "../detail/application-detail.types";

type ApprovalProgressDiagramProps = {
  application: ApplicationDetailViewModel;
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  steps: ApplicationProgressStep[];
};

/**
 * 申請の承認進捗をステップ図として表示します。
 */
export function ApprovalProgressDiagram({
  application,
  corrections,
  fields,
  steps,
}: ApprovalProgressDiagramProps) {
  const visualSteps = useMemo(
    () => [...steps].sort((a, b) => a.stepOrder - b.stepOrder),
    [steps],
  );
  const selectableSteps = visualSteps.filter(isSelectableProgressStep);
  const [selectedStepId, setSelectedStepId] = useState(
    selectableSteps.find((step) => step.status === "current")?.id ??
      selectableSteps[0]?.id ??
      "",
  );

  if (visualSteps.length === 0) {
    return null;
  }

  const gridColumns = `repeat(${visualSteps.length + 1}, minmax(0, 1fr))`;

  return (
    <Card>
      <CardHeader>
        <CardHeading
          description="左から右に向かって承認が進みます"
          title="承認ステップ"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div
            className="grid w-full gap-3"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <ApprovalProgressStartCard
              application={application}
            />
            {visualSteps.map((step) => {
              const isSelectable = isSelectableProgressStep(step);
              return (
                <ApprovalProgressStepCard
                  key={step.id}
                  isSelected={step.id === selectedStepId}
                  onSelect={isSelectable ? () => setSelectedStepId(step.id) : undefined}
                  step={step}
                />
              );
            })}
          </div>
          <SelectedProgressStepApplication
            application={application}
            corrections={corrections}
            fields={fields}
            selectedStepId={selectedStepId}
            steps={visualSteps}
          />
        </div>
      </CardContent>
    </Card>
  );
}
