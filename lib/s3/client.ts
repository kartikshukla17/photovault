// S3 client configuration
// You'll need to add: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

// URL expiry times
const UPLOAD_URL_EXPIRY = 60 * 15; // 15 minutes for uploads
const DOWNLOAD_URL_EXPIRY = 60 * 15; // 15 minutes for viewing

/**
 * Generate a pre-signed URL for uploading a file to S3
 */
export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: UPLOAD_URL_EXPIRY });
}

/**
 * Generate a pre-signed URL for viewing/downloading a file from S3
 */
export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: DOWNLOAD_URL_EXPIRY });
}

/**
 * Delete an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete multiple objects from S3 (original, preview, thumb)
 */
export async function deletePhotoObjects(
  originalKey: string,
  previewKey: string,
  thumbKey: string
): Promise<void> {
  await Promise.all([
    deleteObject(originalKey),
    deleteObject(previewKey),
    deleteObject(thumbKey),
  ]);
}

/**
 * Generate S3 keys for a new photo upload
 */
export function generatePhotoKeys(userId: string, photoId: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const basePath = `users/${userId}/photos/${photoId}`;

  return {
    original: `${basePath}/original.${ext}`,
    preview: `${basePath}/preview.webp`,
    thumb: `${basePath}/thumb.webp`,
  };
}
