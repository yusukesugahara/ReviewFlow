"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

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
