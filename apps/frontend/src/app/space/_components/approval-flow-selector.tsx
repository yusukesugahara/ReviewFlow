"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

type ApprovalStep = {
  id: string;
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
  assigneeUserIds?: string[];
  canReturn: boolean;
};

type ApprovalFlow = {
  id: string;
  name: string;
  isActive: boolean;
  steps: ApprovalStep[];
};

type ApprovalFlowSelectorProps = {
  flows: ApprovalFlow[];
};

export function ApprovalFlowSelector({ flows }: ApprovalFlowSelectorProps) {
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flows[0]?.id ?? "");

  const selectedFlow = useMemo(
    () => flows.find((f) => f.id === selectedFlowId) ?? flows[0] ?? null,
    [flows, selectedFlowId]
  );

  if (flows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        承認フローがまだありません
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-2">
        {flows.map((flow) => {
          const isSelected = selectedFlow?.id === flow.id;
          return (
            <button
              key={flow.id}
              type="button"
              onClick={() => setSelectedFlowId(flow.id)}
              className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? "border-violet-300 bg-violet-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{flow.name}</p>
                <Badge variant={flow.isActive ? "default" : "secondary"}>
                  {flow.isActive ? "有効" : "無効"}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {selectedFlow ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedFlow.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Flow ID: {selectedFlow.id}
                </p>
              </div>
              <Badge variant={selectedFlow.isActive ? "default" : "secondary"}>
                {selectedFlow.isActive ? "有効" : "無効"}
              </Badge>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                プレビュー
              </p>
              <div className="space-y-2">
                {selectedFlow.steps
                  .slice()
                  .sort((a, b) => a.stepOrder - b.stepOrder)
                  .map((step) => {
                    const assigneeUserIds =
                      step.assigneeUserIds && step.assigneeUserIds.length > 0
                        ? step.assigneeUserIds
                        : [step.assigneeUserId];
                    return (
                    <div key={step.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className="w-8 justify-center">
                        {step.stepOrder}
                      </Badge>
                      <span className="font-medium">{step.stepName}</span>
                      <Badge variant="secondary" className="text-xs">
                        承認者: {assigneeUserIds.length}人
                      </Badge>
                      {step.canReturn ? (
                        <Badge variant="outline" className="text-xs">
                          差し戻し可
                        </Badge>
                      ) : null}
                    </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
