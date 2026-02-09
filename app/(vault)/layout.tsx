import type { ReactNode } from "react";

import { VaultShell } from "@/components/vault/vault-shell";
import { VaultProvider } from "@/lib/vault/vault-context";

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <VaultProvider>
      <VaultShell>{children}</VaultShell>
    </VaultProvider>
  );
}

