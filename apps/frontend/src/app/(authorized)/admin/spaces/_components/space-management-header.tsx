"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SpaceCreateUser = {
  id: string;
  email: string;
  name: string | null;
};

type SpaceManagementHeaderProps = {
  canCreateSpace: boolean;
  users: SpaceCreateUser[];
  createSpaceAction: (formData: FormData) => Promise<void>;
};

/**
 * スペース管理画面のヘッダーと作成導線を表示します。
 */
export function SpaceManagementHeader({
  canCreateSpace,
  users,
  createSpaceAction,
}: SpaceManagementHeaderProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreateSpace ? (
          <Button
            type="button"
            variant="outline"
            className="bg-white"
            onClick={() => setIsCreateOpen((open) => !open)}
          >
            スペースを作成
          </Button>
        ) : null}
      </div>

      {canCreateSpace && isCreateOpen ? (
        <Card>
          <CardHeader>
            <CardHeading
              description="スペース作成時に初期スペース管理者を1人以上指定します"
              title="新しいスペースを作成"
            />
          </CardHeader>
          <CardContent>
            <form action={createSpaceAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">スペース名</Label>
                <Input id="name" name="name" required placeholder="経理部" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="スペースの用途や範囲"
                />
              </div>
              <div className="grid gap-2">
                <Label>初期スペース管理者</Label>
                <div className="grid max-h-56 gap-2 overflow-auto rounded-md border border-slate-200 p-3 md:grid-cols-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        className="h-4 w-4 rounded border-slate-300"
                        name="adminUserIds"
                        type="checkbox"
                        value={user.id}
                      />
                      <span className="min-w-0 truncate">
                        {user.name ?? user.email}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-fit" type="submit">
                作成
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
