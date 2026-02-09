"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { IconAlbums, IconCloudUp, IconGrid, IconSettings } from "./icons";

const items = [
  { href: "/gallery", label: "Photos", Icon: IconGrid },
  { href: "/albums", label: "Albums", Icon: IconAlbums },
  { href: "/backup", label: "Backup", Icon: IconCloudUp },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-[430px] px-5">
        <nav
          className={cn(
            "h-[82px] pt-2.5 pb-6",
            "bg-bg-base/90 backdrop-blur-[24px]",
            "border-t border-bg-elevated",
            "flex items-center justify-between",
          )}
          style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
          aria-label="Primary"
        >
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1",
                  "text-[10px] font-semibold tracking-[0.5px]",
                  active ? "text-accent-primary" : "text-[#4A4868]",
                )}
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden />
                <span>{label}</span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    active ? "bg-accent-primary" : "bg-transparent",
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
