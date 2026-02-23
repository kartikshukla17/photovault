"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { withSearchParams } from "@/lib/search-params";

export type UploadSheetStep = "idle" | "uploading" | "done";

export type UploadSheetContext = {
  albumId?: string | null;
};

export function useUploadSheet() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const open = params.get("upload") === "1";
  const step = (params.get("uploadStep") ?? "idle") as UploadSheetStep;
  const albumId = params.get("uploadAlbum");

  return {
    open,
    step,
    albumId,
    openSheet(nextStep: UploadSheetStep = "idle", context?: UploadSheetContext) {
      router.replace(
        withSearchParams(pathname, params, {
          upload: "1",
          uploadStep: nextStep,
          uploadAlbum: context?.albumId ?? null,
        }),
        { scroll: false },
      );
    },
    setStep(nextStep: UploadSheetStep) {
      router.replace(
        withSearchParams(pathname, params, {
          upload: "1",
          uploadStep: nextStep,
          uploadAlbum: albumId ?? null,
        }),
        { scroll: false },
      );
    },
    closeSheet() {
      router.replace(
        withSearchParams(pathname, params, {
          upload: null,
          uploadStep: null,
          uploadAlbum: null,
        }),
        { scroll: false },
      );
    },
  };
}
