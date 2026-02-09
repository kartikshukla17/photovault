import { Suspense } from "react";

import GalleryClient from "./gallery-client";

export default function GalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryClient />
    </Suspense>
  );
}

