"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { useVault } from "@/lib/vault/vault-context";
import { formatBytes } from "@/lib/format";

const navItems = [
  { href: "/gallery", label: "Photos", icon: "⊞" },
  { href: "/albums", label: "Albums", icon: "◫" },
  { href: "/backup", label: "Backup", icon: "↑" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const vault = useVault();

  const totalPhotos = vault.photos.length;
  const albumCount = vault.albums.filter((a) => a.id !== "all").length;
  const usedBytes = vault.photos.reduce((sum, p) => sum + p.sizeBytes, 0);
  const totalBytes = 50 * 1024 ** 3;
  const usedGB = (usedBytes / 1024 ** 3).toFixed(1);
  const totalGB = (totalBytes / 1024 ** 3).toFixed(0);

  return (
    <aside
      className={cn(
        // Desktop: fixed sidebar on left
        "hidden md:flex",
        "w-[210px] flex-shrink-0",
        "bg-[#090909] border-r border-bg-elevated",
        "flex-col h-screen sticky top-0"
      )}
    >
      {/* Brand */}
      <div className="px-[18px] pt-[26px] pb-[22px] border-b border-bg-elevated">
        <div className="flex items-center gap-[10px]">
          <div
            className={cn(
              "w-[34px] h-[34px] rounded-[9px]",
              "bg-[linear-gradient(135deg,#c8a97e,#7a5230)]",
              "flex items-center justify-center",
              "text-[17px] shadow-[0_4px_16px_rgba(200,169,126,0.2)]"
            )}
          >
            ◈
          </div>
          <div>
            <div className="font-display text-[15px] text-text-primary tracking-[-0.2px]">
              PhotoVault
            </div>
            <div className="text-[9px] text-text-caption tracking-[1px] uppercase mt-[1px]">
              Personal · AWS S3
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-[10px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const count =
            item.href === "/gallery"
              ? totalPhotos
              : item.href === "/albums"
              ? albumCount
              : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-btn flex items-center gap-[9px] w-full",
                "px-[11px] py-[9px] rounded-[8px] mb-[1px]",
                "text-[13px] transition-all duration-150",
                isActive
                  ? "bg-bg-elevated text-accent-primary font-semibold"
                  : "bg-transparent text-text-muted font-normal"
              )}
            >
              <span className="text-[15px] w-[18px] text-center flex-shrink-0">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-[7px] py-[2px] rounded-[10px]",
                    isActive
                      ? "text-accent-primary bg-accent-glow"
                      : "text-text-caption bg-bg-elevated"
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Storage Meter */}
      <div className="px-[14px] py-[14px] pb-[18px] border-t border-bg-elevated">
        <div className="flex items-center justify-between mb-[5px]">
          <span className="text-[10px] text-text-caption uppercase tracking-[0.6px]">
            S3 Storage
          </span>
          <span className="text-[10px] text-text-muted">
            {usedGB} / {totalGB} GB
          </span>
        </div>
        <div className="h-[2px] bg-bg-border rounded-[2px] mb-[7px]">
          <div
            className="h-full bg-[linear-gradient(90deg,#c8a97e,#e8c99e)] rounded-[2px]"
            style={{ width: `${(usedBytes / totalBytes) * 100}%` }}
          />
        </div>
        <div className="text-[10px] text-text-caption">
          {totalPhotos} photos · {formatBytes(usedBytes)} used
        </div>
      </div>
    </aside>
  );
}

// Mobile bottom navigation
export function MobileNav() {
  const pathname = usePathname();
  const vault = useVault();

  const totalPhotos = vault.photos.length;
  const albumCount = vault.albums.filter((a) => a.id !== "all").length;

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-[#0a0a0a]/95 backdrop-blur-xl",
        "border-t border-bg-elevated",
        "px-2 pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex justify-around items-center h-[60px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const count =
            item.href === "/gallery"
              ? totalPhotos
              : item.href === "/albums"
              ? albumCount
              : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all",
                isActive
                  ? "text-accent-primary"
                  : "text-text-muted active:text-text-primary"
              )}
            >
              <span className="text-[20px] relative">
                {item.icon}
                {count !== undefined && count > 0 && (
                  <span className="absolute -top-1 -right-3 text-[8px] bg-accent-primary text-black px-1 rounded-full min-w-[14px] text-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className={cn("text-[10px]", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
