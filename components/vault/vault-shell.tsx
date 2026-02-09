"use client";

import * as React from "react";

import { Sidebar, MobileNav } from "@/components/vault/sidebar";
import { UploadSheet } from "@/components/vault/upload-sheet";
import { cn } from "@/lib/cn";

export function VaultShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-screen",
        "bg-bg-base text-text-primary",
        "flex flex-col md:flex-row"
      )}
    >
      <Sidebar />
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col pb-[80px] md:pb-0">
        {children}
      </main>
      <MobileNav />
      <React.Suspense fallback={null}>
        <UploadSheet />
      </React.Suspense>
    </div>
  );
}
