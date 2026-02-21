export type UserStorageConfig = {
  provider: "aws_s3";
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string | null;
  quotaBytes?: number | null;
};

export type UserStoragePublicInfo = {
  configured: boolean;
  provider?: "aws_s3";
  bucket?: string;
  region?: string;
  endpoint?: string | null;
  quotaBytes?: number | null;
  usedBytes?: number;
  photoCount?: number;
};

