"use client";

import { Suspense } from "react";

import AlbumsClient from "./albums-client";

export default function AlbumsPage() {
  return (
    <Suspense fallback={null}>
      <AlbumsClient />
    </Suspense>
  );
}
