"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PublicApplicationUrlCardProps = {
  path: string;
};

export function PublicApplicationUrlCard({ path }: PublicApplicationUrlCardProps) {
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    return origin ? `${origin}${path}` : path;
  }, [origin, path]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>公開URL</CardTitle>
        <CardDescription>
          申請者に共有する公開フォームのURLです
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p
            className="min-w-0 flex-1 break-all rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm"
            suppressHydrationWarning
          >
            {publicUrl}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            {copied ? "コピー済み" : "URLをコピー"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
