import * as React from "react";

import { cn } from "@/lib/cn";

type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

function BaseIcon({ className, title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 4h7v7H4z" />
      <path d="M13 4h7v7h-7z" />
      <path d="M4 13h7v7H4z" />
      <path d="M13 13h7v7h-7z" />
    </BaseIcon>
  );
}

export function IconAlbums(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3h10" />
      <path d="M5 7h14" />
      <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
    </BaseIcon>
  );
}

export function IconCloudUp(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 18a4 4 0 0 1 0-8 5.2 5.2 0 0 1 10.3-1.2A3.5 3.5 0 0 1 18 18" />
      <path d="M12 12v7" />
      <path d="M9 15l3-3 3 3" />
    </BaseIcon>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-1.6 2.7-.2-.1a2 2 0 0 0-2.2.2l-.2.2-2.8-1.6v-.3a2 2 0 0 0-1.5-1.6h-.3L9 22l-.2-.2a2 2 0 0 0-2.2-.2l-.2.1L4.8 19l.1-.1a1.8 1.8 0 0 0 .4-2v-.3L2 12l3.3-1.7v-.3a1.8 1.8 0 0 0-.4-2l-.1-.1L6.4 5l.2.1a2 2 0 0 0 2.2-.2l.2-.2L11.8 6.3v.3a2 2 0 0 0 1.5 1.6h.3L15 2l.2.2a2 2 0 0 0 2.2.2l.2-.1L19.2 5l-.1.1a1.8 1.8 0 0 0-.4 2v.3L22 12l-2.6 3z" />
    </BaseIcon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
      <path d="M16.5 16.5 21 21" />
    </BaseIcon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 18l-6-6 6-6" />
    </BaseIcon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18l6-6-6-6" />
    </BaseIcon>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </BaseIcon>
  );
}

export function IconShare(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
    </BaseIcon>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </BaseIcon>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

