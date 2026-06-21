"use client";

import type { ReactNode } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { getBrowserRelayEnvironment } from "./browser-environment";

type BrowserRelayProviderProps = {
  children: ReactNode;
};

/**
 * Client Component 配下で React Relay hooks を使うための Provider です。
 */
export function BrowserRelayProvider({ children }: BrowserRelayProviderProps) {
  return (
    <RelayEnvironmentProvider environment={getBrowserRelayEnvironment()}>
      {children}
    </RelayEnvironmentProvider>
  );
}
