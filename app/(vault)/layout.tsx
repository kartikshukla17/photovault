import type { ReactNode } from "react";

import { VaultShell } from "@/components/vault/vault-shell";
import { VaultProvider } from "@/lib/vault/vault-context";
import { SessionProvider } from "@/components/session/session-provider";

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <VaultProvider>
      <SessionProvider>
        <VaultShell>{children}</VaultShell>
      </SessionProvider>
    </VaultProvider>
  );
}

