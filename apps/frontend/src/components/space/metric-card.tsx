import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  toneClassName: string;
  iconClassName: string;
};

/**
 * スペース画面で使う指標カードを表示します。
 */
export function MetricCard({
  title,
  value,
  description,
  icon,
  toneClassName,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-[15px] font-medium text-slate-600">{title}</CardTitle>
        <div className={`rounded-xl p-2.5 ${toneClassName}`}>
          <span className={`block h-5 w-5 ${iconClassName}`}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums text-slate-900">{value}</div>
        <p className="mt-2 text-[13px] leading-5 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}
