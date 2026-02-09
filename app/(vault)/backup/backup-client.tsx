"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useUploadSheet } from "@/components/vault/use-upload-sheet";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";

const STORAGE_KEY = "photovault-backup-settings";

interface BackupSettings {
  wifiOnly: boolean;
  backgroundUploads: boolean;
  verifyChecksum: boolean;
  deleteAfterBackup: boolean;
}

const defaultSettings: BackupSettings = {
  wifiOnly: true,
  backgroundUploads: true,
  verifyChecksum: true,
  deleteAfterBackup: false,
};

function useBackupSettings() {
  const [settings, setSettings] = React.useState<BackupSettings>(defaultSettings);
  const [loaded, setLoaded] = React.useState(false);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {
      // Ignore errors
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  React.useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore errors
    }
  }, [settings, loaded]);

  const updateSetting = React.useCallback(
    <K extends keyof BackupSettings>(key: K, value: BackupSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return { settings, updateSetting, loaded };
}

const BACKUP_STEPS = [
  {
    n: 1,
    title: "Select photos from phone",
    desc: "Choose which photos to back up",
    icon: "⊞",
    cta: "Choose Photos",
  },
  {
    n: 2,
    title: "Upload directly to S3",
    desc: "Pre-signed URL — server never handles your files",
    icon: "⬆",
    cta: null,
  },
  {
    n: 3,
    title: "Checksum verification",
    desc: "SHA-256 hash confirms perfect copy in S3",
    icon: "✓",
    cta: null,
  },
  {
    n: 4,
    title: "Delete from phone",
    desc: "Only runs after backup is fully confirmed",
    icon: "✕",
    cta: null,
  },
];

export default function BackupClient() {
  const { openSheet } = useUploadSheet();
  const vault = useVault();
  const { settings, updateSetting, loaded } = useBackupSettings();
  const [activeStep, setActiveStep] = React.useState(1);

  const backedUpCount = vault.getBackedUpCount();
  const pendingCount = vault.photos.length - backedUpCount;
  const totalSize = vault.photos.reduce((sum, p) => sum + p.sizeBytes, 0);

  if (!loaded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex-shrink-0 px-4 md:px-[26px] py-3 md:py-[14px] border-b border-bg-elevated bg-[#090909]">
          <div className="font-display text-[18px] md:text-[20px] text-text-primary tracking-[-0.3px]">
            Backup
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted text-[13px]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 md:px-[26px] py-3 md:py-[14px] border-b border-bg-elevated bg-[#090909]">
        <div className="font-display text-[18px] md:text-[20px] text-text-primary tracking-[-0.3px]">
          Backup
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-[26px]">
        <div className="max-w-[540px] mx-auto md:mx-0">
          {/* Description */}
          <p className="text-[13px] text-text-muted leading-[1.75] mb-[26px]">
            Backup Mode uploads photos from your phone to AWS S3, verifies
            integrity via SHA-256 checksum, then allows safe deletion from your
            device. Your originals are never touched once stored.
          </p>

          {/* Steps */}
          {BACKUP_STEPS.map((step) => {
            const isActive = step.n === activeStep;
            return (
              <div
                key={step.n}
                role="button"
                tabIndex={0}
                onClick={() => setActiveStep(step.n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActiveStep(step.n);
                }}
                className={cn(
                  "flex gap-[14px] mb-[14px] p-[17px_18px] rounded-[12px]",
                  "border transition-colors",
                  isActive
                    ? "bg-accent-glow border-accent-primary/[0.14]"
                    : "bg-[#0d0d0d] border-bg-border"
                )}
              >
                <div
                  className={cn(
                    "w-[38px] h-[38px] rounded-[9px] flex items-center justify-center text-[15px] flex-shrink-0",
                    "border",
                    isActive
                      ? "bg-accent-primary/[0.12] border-accent-primary/25 text-accent-primary"
                      : "bg-[#141414] border-bg-border text-text-caption"
                  )}
                >
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div
                    className={cn(
                      "font-semibold text-[13px] mb-[2px]",
                      isActive ? "text-text-primary" : "text-text-muted"
                    )}
                  >
                    Step {step.n}: {step.title}
                  </div>
                  <div
                    className={cn(
                      "text-[11px]",
                      isActive ? "text-text-secondary" : "text-text-caption"
                    )}
                  >
                    {step.desc}
                  </div>
                </div>
                {step.cta ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="self-center flex-shrink-0 h-[30px] text-[11px]"
                    onClick={() => openSheet("idle")}
                  >
                    {step.cta}
                  </Button>
                ) : (
                  <div
                    className={cn(
                      "self-center w-[7px] h-[7px] rounded-full flex-shrink-0",
                      "bg-bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-[10px] mt-[20px]">
            {[
              [String(backedUpCount), "Photos backed up"],
              [formatBytes(totalSize), "Total size"],
              [String(pendingCount), "Pending upload"],
            ].map(([value, label]) => (
              <div
                key={label}
                className={cn(
                  "p-[14px_16px] rounded-[10px] text-center",
                  "bg-[#0d0d0d] border border-bg-border"
                )}
              >
                <div className="font-display text-[20px] text-accent-primary mb-[3px]">
                  {value}
                </div>
                <div className="text-[10px] text-text-muted">{label}</div>
              </div>
            ))}
          </div>

          {/* Settings Card */}
          <div className="mt-[24px]">
            <div className="text-[10px] text-text-muted uppercase tracking-[1px] mb-[10px]">
              Backup Settings
            </div>
            <div className="border border-bg-border rounded-[12px] overflow-hidden">
              {(
                [
                  ["wifiOnly", "Wi-Fi only", "Only upload on Wi-Fi"],
                  [
                    "backgroundUploads",
                    "Background uploads",
                    "Keep uploading in background",
                  ],
                  ["verifyChecksum", "Verify checksum", "Ensure perfect copies"],
                  [
                    "deleteAfterBackup",
                    "Delete after backup",
                    "Ask before deleting",
                  ],
                ] as const
              ).map(([key, label, sub], i) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-4 px-[15px] py-[13px] bg-[#0d0d0d]",
                    i > 0 && "border-t border-[#141414]"
                  )}
                >
                  <div>
                    <div className="text-[13px] text-text-secondary">{label}</div>
                    <div className="mt-[2px] text-[11px] text-text-caption">
                      {sub}
                    </div>
                  </div>
                  <Toggle
                    checked={settings[key]}
                    onCheckedChange={(next) => updateSetting(key, next)}
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* All backed up message */}
          {pendingCount === 0 && (
            <div className="mt-[24px] p-[18px] rounded-[12px] bg-success/5 border border-success/15 text-center">
              <div className="text-[28px] mb-[6px]">✓</div>
              <div className="text-success font-semibold text-[14px] mb-[3px]">
                All photos backed up!
              </div>
              <div className="text-[11px] text-text-muted">
                Your vault is fully synced with AWS S3
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
