"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const Icon = isVisible ? EyeOff : Eye;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-11", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={isVisible ? "パスワードを隠す" : "パスワードを表示"}
          aria-pressed={isVisible}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500"
          onClick={() => setIsVisible((current) => !current)}
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
