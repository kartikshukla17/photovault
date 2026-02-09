"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/vault/confirm-modal";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import { createClient } from "@/lib/supabase/client";

const SETTINGS_GROUPS = [
  {
    section: "AWS Storage",
    items: [
      { label: "S3 Bucket", value: process.env.NEXT_PUBLIC_S3_BUCKET || "photo--vault", type: "info", active: true },
      { label: "Region", value: process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1", type: "info", active: true },
      { label: "CloudFront CDN", value: "Coming Soon", type: "coming-soon", active: false },
      { label: "S3 Versioning", value: "Coming Soon", type: "coming-soon", active: false },
    ],
  },
  {
    section: "Image Processing",
    items: [
      { label: "Thumbnail generation", value: "Coming Soon", type: "coming-soon", active: false },
      { label: "Preview generation", value: "Coming Soon", type: "coming-soon", active: false },
      { label: "Convert HEIC → WebP", value: "Coming Soon", type: "coming-soon", active: false },
      { label: "Extract EXIF metadata", value: "Coming Soon", type: "coming-soon", active: false },
    ],
  },
  {
    section: "Security",
    items: [
      { label: "Signed URL expiry", value: "15 min", type: "info", active: true },
      { label: "Two-factor auth", value: "Coming Soon", type: "coming-soon", active: false },
      { label: "Rate limit uploads", value: "Coming Soon", type: "coming-soon", active: false },
    ],
  },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-[34px] h-[18px] rounded-[9px] flex-shrink-0 cursor-pointer transition-colors",
        checked
          ? "bg-[linear-gradient(135deg,#c8a97e,#9a6835)]"
          : "bg-[#333]"
      )}
    >
      <div
        className={cn(
          "absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full transition-all shadow-[0_1px_4px_rgba(0,0,0,0.4)]",
          checked ? "right-[2px]" : "left-[2px]"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const vault = useVault();
  const [user, setUser] = React.useState<{ email: string } | null>(null);
  const [toggleStates, setToggleStates] = React.useState<Record<string, boolean>>({
    "CloudFront CDN": true,
    "S3 Versioning": true,
    "Convert HEIC → WebP": true,
    "Extract EXIF metadata": true,
    "Two-factor auth": true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

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

  const usedBytes = vault.photos.reduce((sum, p) => sum + p.sizeBytes, 0);
  const totalBytes = 50 * 1024 ** 3;
  const pct = (usedBytes / totalBytes) * 100;

  const handleToggle = (label: string, checked: boolean) => {
    setToggleStates((prev) => ({ ...prev, [label]: checked }));
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
              <div className="text-[10px] text-accent-primary bg-accent-glow px-[9px] py-[3px] rounded-[10px] border border-accent-primary/25">
                us-east-1
              </div>
            </div>
            <div className="h-[7px] bg-[#181818] rounded-[3px] overflow-hidden">
              <div
                className="h-full bg-[linear-gradient(90deg,#c8a97e,#e8c99e)] rounded-[3px] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-[10px] flex items-center justify-between text-[12px] text-text-secondary">
              <span>
                {formatBytes(usedBytes)} used · {formatBytes(totalBytes - usedBytes)}{" "}
                free
              </span>
              <span>~$0.03/day</span>
            </div>
          </div>

          {/* Settings Groups */}
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.section} className="mt-[24px]">
              <div className="text-[10px] text-text-muted uppercase tracking-[1px] mb-[10px]">
                {group.section}
              </div>
              <div className="border border-bg-border rounded-[12px] overflow-hidden">
                {group.items.map((item, i) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center justify-between px-[15px] py-[13px] bg-[#0d0d0d]",
                      i > 0 && "border-t border-[#141414]",
                      item.type === "coming-soon" && "opacity-60"
                    )}
                  >
                    <div className="text-[13px] text-text-secondary">
                      {item.label}
                    </div>
                    {item.type === "coming-soon" ? (
                      <div className="text-[10px] text-accent-primary/70 bg-accent-primary/10 px-[10px] py-[4px] rounded-full border border-accent-primary/20">
                        Coming Soon
                      </div>
                    ) : item.type === "toggle" ? (
                      <ToggleSwitch
                        checked={toggleStates[item.label] ?? true}
                        onChange={(checked) => handleToggle(item.label, checked)}
                      />
                    ) : (
                      <div className="text-[11px] text-text-muted bg-[#141414] px-[9px] py-[3px] rounded-[6px]">
                        {item.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

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
