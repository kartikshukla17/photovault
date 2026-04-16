import { Suspense } from "react";
import ShareUploadClient from "./share-upload-client";

export default function ShareUploadPage() {
  return (
    <Suspense fallback={null}>
      <ShareUploadClient />
    </Suspense>
  );
}
