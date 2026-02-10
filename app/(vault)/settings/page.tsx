"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/vault/confirm-modal";
import { SessionsCard } from "@/components/settings/sessions-card";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import { createClient } from "@/lib/supabase/client";

type StorageInfo = {
  configured: boolean;
  provider?: "aws_s3";
  bucket?: string;
  region?: string;
  endpoint?: string | null;
  quotaBytes?: number | null;
  usedBytes?: number;
  photoCount?: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const vault = useVault();
  const [user, setUser] = React.useState<{ email: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [storage, setStorage] = React.useState<StorageInfo | null>(null);
  const [loadingStorage, setLoadingStorage] = React.useState(true);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    bucket: "",
    region: "",
    endpoint: "",
    accessKeyId: "",
    secretAccessKey: "",
    quotaGb: "",
  });

  // Fetch user data on mount
  React.useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUser({ email: user.email });
      }
    }
    fetchUser();
  }, []);

  React.useEffect(() => {
    async function fetchStorage() {
      setLoadingStorage(true);
      try {
        const res = await fetch("/api/storage");
        const data = (await res.json()) as StorageInfo & { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load storage");

        setStorage(data);
        setForm((prev) => ({
          ...prev,
          bucket: data.bucket || "",
          region: data.region || "",
          endpoint: data.endpoint || "",
          quotaGb:
            data.quotaBytes && data.quotaBytes > 0
              ? String(Math.round(data.quotaBytes / 1024 ** 3))
              : "",
        }));
      } catch (err) {
        console.error(err);
        setStorage({ configured: false });
      } finally {
        setLoadingStorage(false);
      }
    }
    fetchStorage();
  }, []);

  // Get initials from email
  const getInitials = (email: string) => {
    const name = email.split("@")[0] || "";
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return name.toUpperCase() || "?";
  };

  // Get display name from email
  const getDisplayName = (email: string) => {
    const name = email.split("@")[0] || "";
    // Capitalize first letter of each word
    return name
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const usedBytes =
    storage?.usedBytes ?? vault.photos.reduce((sum, p) => sum + p.sizeBytes, 0);
  const quotaBytes = storage?.quotaBytes ?? null;
  const pct =
    quotaBytes && quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : null;

  const handleSaveStorage = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const quotaBytes =
        form.quotaGb.trim() === ""
          ? null
          : Math.max(0, Number(form.quotaGb)) * 1024 ** 3;

      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "aws_s3",
          bucket: form.bucket,
          region: form.region,
          endpoint: form.endpoint.trim() ? form.endpoint.trim() : null,
          accessKeyId: form.accessKeyId,
          secretAccessKey: form.secretAccessKey,
          quotaBytes: quotaBytes && Number.isFinite(quotaBytes) ? quotaBytes : null,
        }),
      });
      const data = (await res.json()) as StorageInfo & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save storage");
      }

      setStorage(data);
      setForm((prev) => ({ ...prev, accessKeyId: "", secretAccessKey: "" }));
      setSaveSuccess("Storage connected.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    alert("Account deletion would be handled here. This is a demo.");
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 md:px-[26px] py-3 md:py-[14px] border-b border-bg-elevated bg-[#090909]">
        <div className="font-display text-[18px] md:text-[20px] text-text-primary tracking-[-0.3px]">
          Settings
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-[26px]">
        <div className="max-w-[500px] mx-auto md:mx-0">
          {/* Profile Card */}
          <div
            className={cn(
              "p-[16px] rounded-[14px] transition-colors",
              "bg-[#0d0d0d] border border-bg-border"
            )}
          >
            <div className="flex items-center gap-[16px]">
              <div className="h-[58px] w-[58px] rounded-full bg-[linear-gradient(135deg,#c8a97e,#9a6835)] flex items-center justify-center text-white text-[20px] font-bold shadow-[0_4px_16px_rgba(200,169,126,0.2)]">
                {user ? getInitials(user.email) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold text-text-primary">
                  {user ? getDisplayName(user.email) : "Loading..."}
                </div>
                <div className="mt-[2px] text-[13px] text-text-secondary truncate">
                  {user?.email || ""}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-[13px] text-accent-primary hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Storage Card */}
          <div
            className={cn(
              "mt-[14px] p-[16px] rounded-[14px]",
              "bg-[#0d0d0d] border border-bg-border"
            )}
          >
            <div className="flex items-center justify-between gap-4 mb-[12px]">
              <div className="text-[14px] font-semibold text-text-primary">
                Storage
              </div>
              {storage?.configured ? (
                <div className="text-[10px] text-accent-primary bg-accent-glow px-[9px] py-[3px] rounded-[10px] border border-accent-primary/25">
                  {storage.region}
                </div>
              ) : (
                <div className="text-[10px] text-text-muted bg-[#141414] px-[9px] py-[3px] rounded-[10px] border border-bg-border">
                  Not connected
                </div>
              )}
            </div>

            {pct !== null ? (
              <>
                <div className="h-[7px] bg-[#181818] rounded-[3px] overflow-hidden">
                  <div
                    className="h-full bg-[linear-gradient(90deg,var(--pv-accent-primary),var(--pv-accent-light))] rounded-[3px] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-[10px] text-[12px] text-text-secondary">
                  {formatBytes(usedBytes)} used · {formatBytes(Math.max(0, quotaBytes! - usedBytes))} free
                </div>
              </>
            ) : (
              <div className="text-[12px] text-text-secondary">
                {formatBytes(usedBytes)} used
              </div>
            )}

            <div className="mt-4 border-t border-[#141414] pt-4">
              <div className="text-[10px] text-text-muted uppercase tracking-[1px] mb-2">
                Bring your own storage (S3)
              </div>

              {loadingStorage ? (
                <div className="text-[12px] text-text-muted">Loading…</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      value={form.bucket}
                      onChange={(e) => setForm((p) => ({ ...p, bucket: e.target.value }))}
                      placeholder="Bucket name (e.g. my-photo-bucket)"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-[10px]",
                        "bg-bg-elevated border border-bg-border",
                        "text-[13px] text-text-primary placeholder:text-text-muted",
                        "outline-none focus:border-accent-primary/50"
                      )}
                    />
                    <input
                      value={form.region}
                      onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                      placeholder="Region (e.g. eu-north-1)"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-[10px]",
                        "bg-bg-elevated border border-bg-border",
                        "text-[13px] text-text-primary placeholder:text-text-muted",
                        "outline-none focus:border-accent-primary/50"
                      )}
                    />
                    <input
                      value={form.endpoint}
                      onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
                      placeholder="Endpoint (optional, for S3-compatible providers)"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-[10px]",
                        "bg-bg-elevated border border-bg-border",
                        "text-[13px] text-text-primary placeholder:text-text-muted",
                        "outline-none focus:border-accent-primary/50"
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={form.accessKeyId}
                        onChange={(e) => setForm((p) => ({ ...p, accessKeyId: e.target.value }))}
                        placeholder="Access Key ID"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-[10px]",
                          "bg-bg-elevated border border-bg-border",
                          "text-[13px] text-text-primary placeholder:text-text-muted",
                          "outline-none focus:border-accent-primary/50"
                        )}
                      />
                      <input
                        value={form.secretAccessKey}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, secretAccessKey: e.target.value }))
                        }
                        placeholder="Secret Access Key"
                        type="password"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-[10px]",
                          "bg-bg-elevated border border-bg-border",
                          "text-[13px] text-text-primary placeholder:text-text-muted",
                          "outline-none focus:border-accent-primary/50"
                        )}
                      />
                    </div>
                    <input
                      value={form.quotaGb}
                      onChange={(e) => setForm((p) => ({ ...p, quotaGb: e.target.value }))}
                      placeholder="Quota (optional, GB) e.g. 50"
                      inputMode="numeric"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-[10px]",
                        "bg-bg-elevated border border-bg-border",
                        "text-[13px] text-text-primary placeholder:text-text-muted",
                        "outline-none focus:border-accent-primary/50"
                      )}
                    />
                  </div>

                  <div className="mt-3 text-[11px] text-text-muted leading-relaxed">
                    Keys are stored encrypted on the server and are only used to generate
                    short-lived signed URLs.
                  </div>

                  {saveError ? (
                    <div className="mt-3 text-[12px] text-danger">{saveError}</div>
                  ) : null}
                  {saveSuccess ? (
                    <div className="mt-3 text-[12px] text-success">{saveSuccess}</div>
                  ) : null}

                  <div className="mt-3">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleSaveStorage}
                      disabled={
                        saving ||
                        !form.bucket.trim() ||
                        !form.region.trim() ||
                        !form.accessKeyId.trim() ||
                        !form.secretAccessKey.trim()
                      }
                    >
                      {saving ? "Saving…" : "Connect Storage"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Session Security */}
          <SessionsCard />

          {/* Danger Zone */}
          <div className="mt-[24px]">
            <div className="text-[10px] text-danger uppercase tracking-[1px] mb-[10px]">
              Danger Zone
            </div>
            <div className="border border-danger/20 rounded-[12px] overflow-hidden">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={cn(
                  "w-full flex items-center justify-between px-[15px] py-[13px]",
                  "bg-danger/5 hover:bg-danger/10 transition-colors text-left"
                )}
              >
                <div>
                  <div className="text-[13px] text-danger font-semibold">
                    Delete Account
                  </div>
                  <div className="text-[11px] text-danger/60 mt-[2px]">
                    Permanently delete all data
                  </div>
                </div>
                <div className="text-[17px] text-danger/50">›</div>
              </button>
            </div>
          </div>

          {/* Download All */}
          <div className="mt-[14px]">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                alert(
                  "Download would start here. This requires backend implementation."
                )
              }
            >
              Download All Photos
            </Button>
          </div>

          {/* Version */}
          <div className="mt-[24px] pb-[24px] text-center text-[12px] text-text-caption">
            v0.1.0 · PhotoVault
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Account"
        message="This will permanently delete your account and all photos. This action cannot be undone."
        confirmLabel="Delete Forever"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
