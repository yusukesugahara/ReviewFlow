"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * アプリ全体のトースト表示コンテナを提供します。
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      richColors
      closeButton
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "text-sm",
        },
      }}
      {...props}
    />
  );
}
