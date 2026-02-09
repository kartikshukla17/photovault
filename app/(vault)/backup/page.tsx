import { Suspense } from "react";

import BackupClient from "./backup-client";

export default function BackupPage() {
  return (
    <Suspense fallback={null}>
      <BackupClient />
    </Suspense>
  );
}

