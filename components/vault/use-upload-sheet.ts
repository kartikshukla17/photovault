"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { withSearchParams } from "@/lib/search-params";

export type UploadSheetStep = "idle" | "uploading" | "done";

export function useUploadSheet() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const open = params.get("upload") === "1";
  const step = (params.get("uploadStep") ?? "idle") as UploadSheetStep;

  return {
    open,
    step,
    openSheet(nextStep: UploadSheetStep = "idle") {
      router.replace(
        withSearchParams(pathname, params, { upload: "1", uploadStep: nextStep }),
        { scroll: false },
      );
    },
    setStep(nextStep: UploadSheetStep) {
      router.replace(
        withSearchParams(pathname, params, { upload: "1", uploadStep: nextStep }),
        { scroll: false },
      );
    },
    closeSheet() {
      router.replace(
        withSearchParams(pathname, params, { upload: null, uploadStep: null }),
        { scroll: false },
      );
    },
  };
}
