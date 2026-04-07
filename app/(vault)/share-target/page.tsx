import { Suspense } from "react";
import ShareTargetClient from "./share-target-client";

export default function ShareTargetPage() {
  return (
    <Suspense fallback={null}>
      <ShareTargetClient />
    </Suspense>
  );
}
