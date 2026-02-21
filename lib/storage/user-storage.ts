import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";

import type { UserStorageConfig, UserStoragePublicInfo } from "./types";

export async function getUserStoragePublicInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<UserStoragePublicInfo> {
  const { data, error } = await supabase
    .from("user_storage")
    .select("provider,bucket,region,endpoint,quota_bytes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { configured: false };

  return {
    configured: true,
    provider: data.provider,
    bucket: data.bucket,
    region: data.region,
    endpoint: data.endpoint,
    quotaBytes: data.quota_bytes,
  };
}

export async function getUserStorageConfigOrThrow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<UserStorageConfig> {
  const { data, error } = await supabase
    .from("user_storage")
    .select(
      "provider,bucket,region,endpoint,quota_bytes,access_key_id_enc,secret_access_key_enc",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Storage not configured");
  }

  return {
    provider: data.provider,
    bucket: data.bucket,
    region: data.region,
    endpoint: data.endpoint,
    quotaBytes: data.quota_bytes,
    accessKeyId: decryptSecret(data.access_key_id_enc),
    secretAccessKey: decryptSecret(data.secret_access_key_enc),
  };
}

export async function upsertUserStorageConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  input: {
    provider?: "aws_s3";
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string | null;
    quotaBytes?: number | null;
  },
): Promise<UserStoragePublicInfo> {
  const payload = {
    user_id: userId,
    provider: input.provider ?? "aws_s3",
    bucket: input.bucket,
    region: input.region,
    endpoint: input.endpoint ?? null,
    quota_bytes: input.quotaBytes ?? null,
    access_key_id_enc: encryptSecret(input.accessKeyId),
    secret_access_key_enc: encryptSecret(input.secretAccessKey),
  };

  const { error } = await supabase.from("user_storage").upsert(payload, {
    onConflict: "user_id",
  });
  if (error) throw error;

  return {
    configured: true,
    provider: payload.provider,
    bucket: payload.bucket,
    region: payload.region,
    endpoint: payload.endpoint,
    quotaBytes: payload.quota_bytes,
  };
}
